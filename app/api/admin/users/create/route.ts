import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── POST /api/admin/users/create ──────────────────────────────────────────────
// Create a new user with first name, last name, email and password.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  let body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  const { firstName, lastName, email, password } = body;

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json(
      { error: "Fornavn, etternavn, e-post og passord er påkrevd" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Passord må være minst 8 tegn" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      full_name: `${firstName.trim()} ${lastName.trim()}`,
    },
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog({
    adminId: auth.user.id,
    action: "user.create",
    targetType: "user",
    targetId: data.user.id,
    metadata: { email: data.user.email, name: `${firstName.trim()} ${lastName.trim()}` },
  });

  return NextResponse.json({
    user: {
      id: data.user.id,
      email: data.user.email,
      name: `${firstName.trim()} ${lastName.trim()}`,
    },
  });
}
