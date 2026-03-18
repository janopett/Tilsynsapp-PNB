import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// List all users with their admin status.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 200 });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data.users.map((u) => {
    const m = u.user_metadata ?? {};
    const firstName = (m.first_name as string | undefined)?.trim();
    const lastName = (m.last_name as string | undefined)?.trim();
    const name =
      (firstName && lastName ? `${firstName} ${lastName}` : firstName ?? lastName) ??
      (m.full_name as string | undefined) ??
      (m.name as string | undefined) ??
      null;
    return {
      id: u.id,
      email: u.email,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      name,
      isAdmin: u.app_metadata?.is_admin === true,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
    };
  });

  return NextResponse.json({ users });
}

// ── POST /api/admin/users ─────────────────────────────────────────────────────
// Set or remove admin status for a user.
// Body: { userId: string, isAdmin: boolean }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  let body: { userId?: string; isAdmin?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId || typeof body.isAdmin !== "boolean") {
    return NextResponse.json(
      { error: "userId and isAdmin are required" },
      { status: 400 }
    );
  }

  // Prevent removing own admin status
  if (body.userId === auth.user.id && !body.isAdmin) {
    return NextResponse.json(
      { error: "Du kan ikke fjerne din egen admin-tilgang" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(body.userId, {
    app_metadata: { is_admin: body.isAdmin },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// ── PATCH /api/admin/users ────────────────────────────────────────────────────
// Update first/last name for a user.
// Body: { userId: string, firstName: string, lastName: string }
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  let body: { userId?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, firstName, lastName } = body;
  if (!userId || !firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json(
      { error: "userId, firstName og lastName er påkrevd" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
