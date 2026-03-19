import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";

// ── GET /api/inspection-config?category=tilsynsomrade ────────────────────────
// Returns active list items for the given category.
// Accessible by all authenticated users.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const category = new URL(req.url).searchParams.get("category");
  if (!category) {
    return NextResponse.json({ error: "category is required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("inspection_list_items")
    .select("id, label, sort_order")
    .eq("category", category)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, items: data ?? [] });
}
