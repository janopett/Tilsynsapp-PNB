import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { synchronizeContactPerson } from "@/lib/sif/contact-service";

// ── POST /api/sif/sync-contact-person ────────────────────────────────────────
// Test endpoint for ContactService/SynchronizeContactPerson.
// Creates or updates a contact person in PNB and returns their Recno.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const { firstName, lastName, enterprise, externalId, title } = body ?? {};

  if (!externalId?.trim()) {
    return NextResponse.json({ ok: false, error: "externalId er påkrevd" }, { status: 400 });
  }
  if (!firstName?.trim() && !lastName?.trim()) {
    return NextResponse.json({ ok: false, error: "Minst fornavn eller etternavn må oppgis" }, { status: 400 });
  }

  try {
    const recno = await synchronizeContactPerson({
      externalId: externalId.trim(),
      firstName: firstName?.trim() || undefined,
      lastName: lastName?.trim() || undefined,
      enterprise: enterprise?.trim() || undefined,
      title: title?.trim() || undefined,
    });
    return NextResponse.json({ ok: true, recno });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
