import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { testSifConnection } from "@/lib/sif/support-service";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await testSifConnection();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
