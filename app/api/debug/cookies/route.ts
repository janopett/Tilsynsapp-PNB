import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const cookieStore = await cookies();
  const all = cookieStore.getAll();

  const supabaseCookies = all.filter((c) => c.name.startsWith("sb-"));

  return NextResponse.json({
    total_cookies: all.length,
    supabase_cookies: supabaseCookies.map((c) => ({
      name: c.name,
      length: c.value.length,
      // Return only length, not value preview — cookie values are sensitive
    })),
    all_cookie_names: all.map((c) => c.name),
  });
}
