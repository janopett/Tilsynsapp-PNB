// ============================================================
// GET   /api/cases/[number]/tasks  — hent oppgaver for en sak
// POST  /api/cases/[number]/tasks  — opprett ny oppgave
// PATCH /api/cases/[number]/tasks  — oppdater oppgavestatus
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
// GET /api/cases/[number]/tasks
// ============================================================

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = decodeURIComponent(params.number);
  const supabase = getServiceClient();

  const { data: caseRow } = await supabase
    .from("cases")
    .select("id")
    .eq("sif_case_number", caseNumber)
    .single();

  if (!caseRow) {
    return NextResponse.json({ tasks: [] });
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, due_date, created_at")
    .eq("case_id", caseRow.id)
    .eq("user_id", auth.user.id)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data ?? [] });
}

// ============================================================
// POST /api/cases/[number]/tasks
// ============================================================

const CreateTaskSchema = z.object({
  title: z.string().min(1, "Tittel er påkrevd"),
  description: z.string().optional(),
  status: z.enum(["open", "completed"]).default("open"),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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

  const parsed = CreateTaskSchema.safeParse(body);
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
    .from("tasks")
    .insert({
      case_id: caseRow.id,
      user_id: auth.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      due_date: parsed.data.due_date ?? null,
    })
    .select("id, title, description, status, priority, due_date, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// ============================================================
// PATCH /api/cases/[number]/tasks — oppdater én oppgave (id i body)
// ============================================================

const PatchTaskSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "completed"]).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const parsed = PatchTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...updates } = parsed.data;
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
