import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getSifUserByLogin } from "@/lib/sif/extensions/user-service";
import { createServiceClient } from "@/lib/supabase/server";

export interface UserProfileResponse {
  pnb_contact_recno: number | null;
  pnb_login: string | null;
}

/** GET /api/sif/user-profile — returns the current user's cached PNB contact recno */
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from("user_profiles")
    .select("pnb_contact_recno, pnb_login")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    pnb_contact_recno: data?.pnb_contact_recno ?? null,
    pnb_login: data?.pnb_login ?? null,
  } satisfies UserProfileResponse);
}

/**
 * POST /api/sif/user-profile — looks up the user in PNB by their email (AD login)
 * and caches the contact recno on their profile.
 * Accepts an optional body: { login?: string } to override the email used for lookup.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user } = auth;

  const body = await req.json().catch(() => null);
  const login: string = body?.login?.trim() || user.email || "";

  if (!login) {
    return NextResponse.json({ error: "Ingen login å slå opp" }, { status: 400 });
  }

  const sifUser = await getSifUserByLogin(login).catch(() => null);
  if (!sifUser?.ContactRecno) {
    return NextResponse.json(
      { error: `Fant ingen 360°-bruker for login: ${login}` },
      { status: 404 }
    );
  }

  const serviceClient = await createServiceClient();
  await serviceClient.from("user_profiles").upsert(
    {
      user_id: user.id,
      pnb_contact_recno: sifUser.ContactRecno,
      pnb_login: sifUser.Login ?? login,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return NextResponse.json({
    pnb_contact_recno: sifUser.ContactRecno,
    pnb_login: sifUser.Login ?? login,
  } satisfies UserProfileResponse);
}
