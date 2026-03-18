import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = cookies();
  const all = cookieStore.getAll();

  const supabaseCookies = all.filter((c) => c.name.startsWith("sb-"));

  return NextResponse.json({
    total_cookies: all.length,
    supabase_cookies: supabaseCookies.map((c) => ({
      name: c.name,
      length: c.value.length,
      preview: c.value.slice(0, 60) + "…",
    })),
    all_cookie_names: all.map((c) => c.name),
  });
}
