import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";

// ── GET /api/admin/archivals ──────────────────────────────────────────────────
// Returns all inspection_archivals joined with inspection metadata.
// Admin only. Uses service client to bypass RLS.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);
  const offset = Number(searchParams.get("offset") ?? 0);
  const status = searchParams.get("status"); // optional filter

  const supabase = createServiceClient();

  let query = supabase
    .from("inspection_archivals")
    .select(
      `id, created_at, updated_at, status,
       sif_case_number, sif_case_recno,
       sif_document_number, sif_document_recno, sif_document_url,
       request_payload_json, response_payload_json,
       error_message, archived_at,
       inspections(id, property_address, case_number, inspection_date, user_id)`
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ archivals: data ?? [], total: data?.length ?? 0 });
}
