// ============================================================
// GET  /api/cases/[number]/visits  — hent besøk for en sak
// POST /api/cases/[number]/visits  — opprett nytt besøk
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
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
// GET /api/cases/[number]/visits
// ============================================================

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);
  const supabase = getServiceClient();

  // Finn case_id fra saksnummer
  const { data: caseRow } = await supabase
    .from("cases")
    .select("id")
    .eq("sif_case_number", caseNumber)
    .single();

  if (!caseRow) {
    return NextResponse.json({ visits: [] });
  }

  const { data, error } = await supabase
    .from("visits")
    .select("id, scheduled_at, completed_at, notes, status, created_at, user_id")
    .eq("case_id", caseRow.id)
    .eq("user_id", auth.user.id)
    .order("scheduled_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ visits: data ?? [] });
}

// ============================================================
// POST /api/cases/[number]/visits
// ============================================================

const CreateVisitSchema = z.object({
  scheduled_at: z.string().datetime({ message: "Ugyldig dato/tid-format" }),
  notes: z.string().optional(),
  status: z.enum(["planned", "completed", "cancelled"]).default("planned"),
});

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const parsed = CreateVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Finn eller opprett lokal sak
  let { data: caseRow } = await supabase
    .from("cases")
    .select("id")
    .eq("sif_case_number", caseNumber)
    .single();

  if (!caseRow) {
    const { data: newCase } = await supabase
      .from("cases")
      .insert({ sif_case_number: caseNumber, title: caseNumber })
      .select("id")
      .single();
    caseRow = newCase;
  }

  if (!caseRow) {
    return NextResponse.json({ error: "Kunne ikke opprette sak lokalt" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("visits")
    .insert({
      case_id: caseRow.id,
      user_id: auth.user.id,
      scheduled_at: parsed.data.scheduled_at,
      notes: parsed.data.notes ?? null,
      status: parsed.data.status,
    })
    .select("id, scheduled_at, notes, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
