import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { synchronizeContactPerson } from "@/lib/sif/contact-service";
import { sifRpcCall } from "@/lib/sif/client";

// ── GET /api/sif/sync-contact-person?externalId=... ──────────────────────────
// Debug: raw GetContactPersons response for a given ExternalId.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const externalId = new URL(req.url).searchParams.get("externalId");
  if (!externalId) {
    return NextResponse.json({ ok: false, error: "externalId query param required" }, { status: 400 });
  }

  try {
    const raw = await sifRpcCall(
      "ContactService",
      "GetContactPersons",
      { ExternalId: externalId, MaxRows: 5 },
      undefined,
      true
    );
    return NextResponse.json({ ok: true, raw });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}

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
