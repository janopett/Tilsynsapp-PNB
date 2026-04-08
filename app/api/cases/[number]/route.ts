// ============================================================
// GET   /api/cases/[number]   — hent enkelt sak fra SIF
// PATCH /api/cases/[number]   — oppdater lokal metadata (priority, notes)
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { findCaseInSif } from "@/lib/sif/case-service";
import { createClient as serviceClient } from "@supabase/supabase-js";

function getServiceClient() {
  return serviceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface RouteContext {
  params: { number: string };
}

// ============================================================
// GET /api/cases/[number]
// ============================================================

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);

  try {
    const sifCase = await findCaseInSif({ caseNumber });

    // Cache/oppdater lokal kopi
    const supabase = getServiceClient();
    await supabase.from("cases").upsert(
      {
        sif_case_number: sifCase.caseNumber,
        sif_recno: sifCase.recno,
        title: sifCase.title,
        address: extractAddress(sifCase.raw),
        status: (sifCase.raw as Record<string, unknown>)?.Status as string ?? null,
        raw_sif_data: sifCase.raw,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "sif_case_number" }
    );

    // Hent lokal metadata
    const { data: local } = await supabase
      .from("cases")
      .select("id, priority, notes")
      .eq("sif_case_number", sifCase.caseNumber)
      .single();

    const raw = sifCase.raw as Record<string, unknown>;

    return NextResponse.json({
      id: local?.id ?? null,
      caseNumber: sifCase.caseNumber,
      recno: sifCase.recno,
      title: sifCase.title,
      address: extractAddress(sifCase.raw),
      status: raw?.Status as string ?? null,
      description: raw?.Notes as string ?? null,
      responsiblePerson: (raw?.ResponsiblePerson as Record<string, unknown>)?.Name as string ?? raw?.ResponsiblePersonName as string ?? null,
      responsibleEnterprise: raw?.ResponsibleEnterpriseName as string ?? null,
      createdDate: raw?.CreatedDate as string ?? null,
      lastChangedDate: raw?.LastChangedDate as string ?? null,
      estates: raw?.CaseEstates ?? [],
      contacts: raw?.Contacts ?? [],
      stages: sifCase.stages ?? [],
      url: sifCase.url,
      priority: local?.priority ?? "normal",
      notes: local?.notes ?? null,
    });
  } catch (err) {
    // Fallback til lokal cache
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("sif_case_number", caseNumber)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Sak ikke funnet" }, { status: 404 });
    }

    return NextResponse.json({
      id: data.id,
      caseNumber: data.sif_case_number,
      recno: data.sif_recno,
      title: data.title,
      address: data.address,
      status: data.status,
      priority: data.priority,
      notes: data.notes,
      fromCache: true,
    });
  }
}

// ============================================================
// PATCH /api/cases/[number] — oppdater lokal metadata
// ============================================================

const PatchCaseSchema = z.object({
  priority: z.enum(["low", "normal", "high"]).optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const parsed = PatchCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Sørg for at saken finnes lokalt (upsert minimalt)
  await supabase.from("cases").upsert(
    { sif_case_number: caseNumber, title: caseNumber },
    { onConflict: "sif_case_number", ignoreDuplicates: true }
  );

  const { error } = await supabase
    .from("cases")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("sif_case_number", caseNumber);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function extractAddress(raw: unknown): string | null {
  const r = raw as Record<string, unknown> | undefined;
  if (!r) return null;
  const estates = r.CaseEstates as Array<Record<string, unknown>> | undefined;
  if (estates?.length) {
    const addr = estates[0].Address as Record<string, string> | undefined;
    if (addr?.StreetAddress) {
      return [addr.StreetAddress, addr.ZipCode, addr.ZipPlace].filter(Boolean).join(", ");
    }
  }
  return null;
}
