import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createServiceClient } from "@/lib/supabase/server";

// ── GET /api/admin/inspection-config?category=... ────────────────────────────
// Returns ALL items (including inactive) for admin management.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const category = new URL(req.url).searchParams.get("category");
  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("inspection_list_items")
    .select("id, label, sort_order, active")
    .eq("category", category)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, items: data ?? [] });
}

// ── POST /api/admin/inspection-config ────────────────────────────────────────
// Add a new list item.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const { category, label } = body ?? {};

  if (!category || !label?.trim()) {
    return NextResponse.json({ error: "category and label are required" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Place new item last in its category
  const { data: existing } = await serviceClient
    .from("inspection_list_items")
    .select("sort_order")
    .eq("category", category)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = ((existing?.sort_order as number | null) ?? 0) + 10;

  const { data, error } = await serviceClient
    .from("inspection_list_items")
    .insert({ category, label: label.trim(), sort_order: nextOrder })
    .select("id, label, sort_order, active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminId: auth.user.id,
    action: "inspection_config.create",
    targetType: "inspection_config",
    targetId: String(data.id),
    metadata: { category, label: label.trim() },
  });
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}

// ── DELETE /api/admin/inspection-config?id=... ───────────────────────────────
// Hard delete a list item.
export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const serviceClient = createServiceClient();
  const { error } = await serviceClient
    .from("inspection_list_items")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({
    adminId: auth.user.id,
    action: "inspection_config.delete",
    targetType: "inspection_config",
    targetId: id,
  });
  return NextResponse.json({ ok: true });
}
