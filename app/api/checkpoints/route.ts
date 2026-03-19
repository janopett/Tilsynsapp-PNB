import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";

// ── GET /api/checkpoints ──────────────────────────────────────────────────────
// Returns all active checkpoint definitions from the database.
// Used by inspection pages to get the current checkpoint list.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const serviceClient = createServiceClient();
  const { data, error } = await serviceClient
    .from("checkpoint_definitions")
    .select("id, title, category, description, applies_to, required_tags, severity, legal_reference")
    .eq("active", true)
    .order("category")
    .order("sort_order");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, checkpoints: data ?? [] });
}
