import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return NextResponse.json({
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    app_metadata: user?.app_metadata ?? null,
    is_admin: user?.app_metadata?.is_admin ?? null,
    error: error?.message ?? null,
  });
}
