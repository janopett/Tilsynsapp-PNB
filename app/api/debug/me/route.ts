import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    is_admin: user?.app_metadata?.is_admin ?? null,
    error: error?.message ?? null,
  });
}
