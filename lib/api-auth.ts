import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { User, SupabaseClient } from "@supabase/supabase-js";

type AuthSuccess = { user: User; supabase: SupabaseClient; error: null };
type AuthFailure = { user: null; supabase: null; error: NextResponse };

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

/**
 * Like requireUser, but also checks that the user has is_admin = true
 * in their app_metadata (set via Supabase service role / admin panel).
 */
export async function requireAdmin(
  req: NextRequest
): Promise<AuthSuccess | AuthFailure> {
  const auth = await requireUser(req);
  if (auth.error) return auth;

  const isAdmin = auth.user.app_metadata?.is_admin === true;
  if (!isAdmin) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return auth;
}
