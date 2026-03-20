import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sifRpcCall } from "@/lib/sif/client";
import type { SifUpdateContactPersonInput, SifUpdateContactPersonResult } from "@/lib/sif/types";

// ── POST /api/sif/update-contact-person ──────────────────────────────────────
// Test endpoint for ContactService/UpdateContactPerson.
// Calls the SIF endpoint directly and returns the raw response for inspection.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => null);
  const { recno, firstName, lastName, externalId, enterprise, title } = body ?? {};

  if (!recno || typeof recno !== "number") {
    return NextResponse.json({ ok: false, error: "recno (tall) er påkrevd" }, { status: 400 });
  }

  // Resolve enterprise: "recno:XXXX" or bare integer → "recno:XXXX"
  let enterpriseForSif: string | undefined;
  if (enterprise?.trim()) {
    const m = String(enterprise).match(/^recno:(\d+)$/i) ?? String(enterprise).match(/^(\d+)$/);
    if (m) enterpriseForSif = `recno:${m[1]}`;
  }

  const payload: SifUpdateContactPersonInput = {
    Recno: recno,
    FirstName: firstName?.trim() || undefined,
    LastName: lastName?.trim() || undefined,
    ExternalId: externalId?.trim() || undefined,
    Enterprise: enterpriseForSif,
    Title: title?.trim() || undefined,
    Active: true,
  };

  try {
    const raw = await sifRpcCall<SifUpdateContactPersonInput, SifUpdateContactPersonResult>(
      "ContactService",
      "UpdateContactPerson",
      payload,
      undefined,
      true
    );
    return NextResponse.json({ ok: raw.Successful ?? false, raw });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
