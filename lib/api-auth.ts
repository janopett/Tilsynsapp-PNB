import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User, SupabaseClient } from "@supabase/supabase-js";

export function getAuthClient(req: NextRequest): SupabaseClient {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function requireUser(req: NextRequest): Promise<
  { user: User; supabase: SupabaseClient; error: null } |
  { user: null; supabase: null; error: NextResponse }
> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return { user: null, supabase: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = getAuthClient(req);
  const { data: { user } } = await supabase.auth.getUser(token);

  if (!user) {
    return { user: null, supabase: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, supabase, error: null };
}
