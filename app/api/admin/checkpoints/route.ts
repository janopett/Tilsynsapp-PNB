import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createServiceClient } from "@/lib/supabase/server";

// ── GET /api/admin/checkpoints ────────────────────────────────────────────────
// Returns ALL checkpoints (including inactive) for admin management.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("checkpoint_definitions")
    .select("*")
    .order("category")
    .order("sort_order");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkpoints: data ?? [] });
}

// ── POST /api/admin/checkpoints ───────────────────────────────────────────────
// Create a new checkpoint definition.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim() || !body?.category) {
    return NextResponse.json({ error: "title and category are required" }, { status: 400 });
  }

  const serviceClient = await createServiceClient();

  // Find the highest sort_order in this category and place the new one last
  const { data: last } = await serviceClient
    .from("checkpoint_definitions")
    .select("sort_order")
    .eq("category", body.category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = ((last?.sort_order as number | null) ?? 0) + 10;

  // Generate a short text ID if not provided
  const id = body.id?.trim() || `CP_${Date.now()}`;

  const { data, error } = await serviceClient
    .from("checkpoint_definitions")
    .insert({
      id,
      title: body.title.trim(),
      category: body.category,
      description: body.description?.trim() ?? "",
      applies_to: body.applies_to ?? [],
      required_tags: body.required_tags ?? [],
      applies_to_omrade: body.applies_to_omrade ?? [],
      applies_to_type_codes: body.applies_to_type_codes ?? [],
      severity: body.severity ?? "info",
      legal_reference: body.legal_reference?.trim() || null,
      legal_reference_url: body.legal_reference_url?.trim() || null,
      active: true,
      sort_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminId: auth.user.id,
    action: "checkpoint.create",
    targetType: "checkpoint",
    targetId: data.id,
    metadata: { title: data.title, category: data.category },
  });
  return NextResponse.json({ ok: true, checkpoint: data }, { status: 201 });
}

// ── PATCH /api/admin/checkpoints ──────────────────────────────────────────────
// Update an existing checkpoint definition.
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const { id, ...fields } = body ?? {};
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  const allowedFields = [
    "title", "category", "description", "applies_to",
    "required_tags", "severity", "legal_reference", "legal_reference_url",
    "active", "sort_order", "applies_to_omrade", "applies_to_type_codes",
  ];
  for (const f of allowedFields) {
    if (f in fields) allowed[f] = fields[f];
  }
  allowed.updated_at = new Date().toISOString();

  const serviceClient = await createServiceClient();
  const { data, error } = await serviceClient
    .from("checkpoint_definitions")
    .update(allowed)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminId: auth.user.id,
    action: "checkpoint.update",
    targetType: "checkpoint",
    targetId: id,
    metadata: allowed,
  });
  return NextResponse.json({ ok: true, checkpoint: data });
}

// ── DELETE /api/admin/checkpoints?id=... ─────────────────────────────────────
// Soft-delete (deactivate) a checkpoint. Hard delete only if no inspection answers use it.
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const serviceClient = await createServiceClient();

  // Check if any inspection answers reference this checkpoint
  const { count } = await serviceClient
    .from("inspection_answers")
    .select("id", { count: "exact", head: true })
    .eq("checkpoint_definition_id", id);

  if ((count ?? 0) > 0) {
    // Soft delete — keep the record but mark inactive
    const { error } = await serviceClient
      .from("checkpoint_definitions")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await writeAuditLog({ adminId: auth.user.id, action: "checkpoint.deactivate", targetType: "checkpoint", targetId: id });
    return NextResponse.json({ ok: true, deactivated: true });
  }

  // Hard delete — no answers reference this checkpoint
  const { error } = await serviceClient
    .from("checkpoint_definitions")
    .delete()
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({ adminId: auth.user.id, action: "checkpoint.delete", targetType: "checkpoint", targetId: id });
  return NextResponse.json({ ok: true, deleted: true });
}
