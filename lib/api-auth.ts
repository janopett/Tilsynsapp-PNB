// ============================================================
// API Route Authentication Guards
//
// Provides two middleware helpers for Next.js Route Handlers:
//   requireUser()  — validates the Bearer JWT, returns the Supabase user
//   requireAdmin() — additionally enforces is_admin = true in app_metadata
//
// Usage pattern:
//   const auth = await requireUser(req);
//   if (auth.error) return auth.error;
//   const { user, supabase } = auth;
// ============================================================

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

type AuthSuccess = { user: User; supabase: SupabaseClient; error: null };
type AuthFailure = { user: null; supabase: null; error: NextResponse };

/**
 * Build a Supabase client that uses the request's Bearer token as the auth context.
 * This ensures RLS policies are evaluated as the authenticated user, not the service role.
 */
export function getAuthClient(req: NextRequest): SupabaseClient {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

/**
 * Validate the Bearer JWT from the Authorization header.
 * Returns the authenticated Supabase user and a user-scoped client on success,
 * or a 401 NextResponse on failure.
 */
export async function requireUser(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const supabase = getAuthClient(req);
  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return {
      user: null,
      supabase: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { user, supabase, error: null };
}

/**
 * Like requireUser(), but also enforces that the user has `is_admin = true`
 * in their Supabase app_metadata. This flag can only be set server-side via
 * the service role key — it cannot be forged by clients.
 * Returns 403 Forbidden if the user is authenticated but not an admin.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthSuccess | AuthFailure> {
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
