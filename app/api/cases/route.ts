// ============================================================
// GET  /api/cases  — hent saksliste fra SIF, cache i Supabase
// POST /api/cases  — opprett ny sak i SIF og cache lokalt
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { getCasesList, createCaseInSif } from "@/lib/sif/case-service";
import { createClient as serviceClient } from "@supabase/supabase-js";

// Supabase service-rolle klient for skriving til cases-tabellen
// (brukere kan lese via RLS, men for synkronisering bruker vi service role)
function getServiceClient() {
  return serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================================
// GET /api/cases
// Query params: page, search, limit
// ============================================================

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const search = searchParams.get("search") ?? undefined;

  // Prioriter-filter: hent saker med lokal høy/normal/lav-merking fra Supabase
  const priorityFilter = searchParams.get("priority") ?? undefined;

  try {
    const { cases, totalCount, totalPages } = await getCasesList({
      page,
      maxResults: limit,
      search,
      sortDescending: true,
    });

    // Cache hentede saker i lokal DB (upsert på sif_case_number)
    if (cases.length > 0) {
      const supabase = getServiceClient();
      const rows = cases.map((c) => ({
        sif_case_number: c.caseNumber,
        sif_recno: c.recno,
        title: c.title,
        address: extractAddress(c),
        status: (c.raw as Record<string, unknown>)?.Status as string | null ?? null,
        raw_sif_data: c.raw,
        last_synced_at: new Date().toISOString(),
      }));

      await supabase
        .from("cases")
        .upsert(rows, { onConflict: "sif_case_number", ignoreDuplicates: false });
    }

    // Hent lokal metadata (priority, notes) for disse saksnumrene
    const supabase = getServiceClient();
    const caseNumbers = cases.map((c) => c.caseNumber);
    const { data: localMeta } = await supabase
      .from("cases")
      .select("sif_case_number, priority, notes, id")
      .in("sif_case_number", caseNumbers);

    const metaMap = new Map(
      (localMeta ?? []).map((m) => [m.sif_case_number, m])
    );

    // Berik SIF-sakene med lokal metadata
    let enriched = cases.map((c) => {
      const local = metaMap.get(c.caseNumber);
      return {
        id: local?.id ?? null,
        caseNumber: c.caseNumber,
        recno: c.recno,
        title: c.title,
        address: extractAddress(c),
        status: (c.raw as Record<string, unknown>)?.Status as string ?? null,
        priority: local?.priority ?? "normal",
        notes: local?.notes ?? null,
        url: c.url,
      };
    });

    // Filtrer på lokal prioritet etter beriking
    if (priorityFilter) {
      enriched = enriched.filter((c) => c.priority === priorityFilter);
    }

    return NextResponse.json({ cases: enriched, totalCount, totalPages });
  } catch (err) {
    console.error("[API] GET /api/cases feil:", err);

    // Fallback: hent fra lokal cache hvis SIF er utilgjengelig
    const supabase = getServiceClient();
    const query = supabase
      .from("cases")
      .select("id, sif_case_number, sif_recno, title, address, status, priority, notes, last_synced_at")
      .order("last_synced_at", { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (priorityFilter) query.eq("priority", priorityFilter);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Kunne ikke hente saker" }, { status: 500 });
    }

    return NextResponse.json({
      cases: (data ?? []).map((c) => ({
        id: c.id,
        caseNumber: c.sif_case_number,
        recno: c.sif_recno,
        title: c.title,
        address: c.address,
        status: c.status,
        priority: c.priority,
        notes: c.notes,
        fromCache: true,
      })),
      fromCache: true,
    });
  }
}

// ============================================================
// POST /api/cases — opprett ny sak i SIF
// ============================================================

const CreateCaseSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  notes: z.string().optional(),
  address: z.string().optional(),
  categoryCode: z.string().optional(),
  contactReferenceNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const parsed = CreateCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, notes, address, categoryCode } = parsed.data;

  const correlationId = crypto.randomUUID();

  // Logg forsøk
  const supabase = getServiceClient();
  await supabase.from("sync_logs").insert({
    type: "case_create",
    status: "pending",
    payload: { title, notes, address, categoryCode },
  });

  try {
    const result = await createCaseInSif(
      {
        Title: title,
        Notes: notes,
        CategoryCode: categoryCode,
        // Adresse håndteres via eiendom i SIF — legger i notes for MVP
        ...(address ? { Notes: [notes, `Adresse: ${address}`].filter(Boolean).join("\n") } : {}),
      },
      correlationId
    );

    if (!result.Successful) {
      await supabase.from("sync_logs").insert({
        type: "case_create",
        status: "failed",
        payload: { title, notes, address },
        error_message: result.ErrorMessage ?? result.ErrorDetails,
      });
      return NextResponse.json(
        { error: result.ErrorMessage ?? "Sak ble ikke opprettet i Plan & Build" },
        { status: 422 }
      );
    }

    // Cache den nye saken lokalt
    const { data: localCase } = await supabase
      .from("cases")
      .insert({
        sif_case_number: result.CaseNumber!,
        sif_recno: result.Recno,
        title,
        address: address ?? null,
        status: "Under behandling",
        priority: "normal",
        notes,
        last_synced_at: new Date().toISOString(),
        created_by: auth.user.id,
      })
      .select("id")
      .single();

    await supabase.from("sync_logs").insert({
      type: "case_create",
      status: "success",
      payload: { title, notes, address },
      response: { caseNumber: result.CaseNumber, recno: result.Recno },
    });

    return NextResponse.json(
      {
        id: localCase?.id,
        caseNumber: result.CaseNumber,
        recno: result.Recno,
        url: result.URL,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    await supabase.from("sync_logs").insert({
      type: "case_create",
      status: "failed",
      payload: { title, notes, address },
      error_message: message,
    });
    console.error("[API] POST /api/cases feil:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ============================================================
// Hjelpefunksjon: trekk ut adresse fra SIF-sak
// ============================================================

function extractAddress(c: { raw?: unknown }): string | null {
  const raw = c.raw as Record<string, unknown> | undefined;
  if (!raw) return null;

  // Prøv CaseEstates først (eiendomsadresse)
  const estates = raw.CaseEstates as Array<Record<string, unknown>> | undefined;
  if (estates?.length) {
    const addr = estates[0].Address as Record<string, string> | undefined;
    if (addr?.StreetAddress) {
      return [addr.StreetAddress, addr.ZipCode, addr.ZipPlace]
        .filter(Boolean)
        .join(", ");
    }
  }

  return null;
}
