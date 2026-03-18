import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getCaseContacts } from "@/lib/sif/contact-service";

// ── GET /api/sif/case-contacts ────────────────────────────────────────────────
// Returns contacts for a specific case. Accepts ?caseRecno=N or ?caseNumber=...
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const caseRecnoStr = searchParams.get("caseRecno");
  const caseNumber = searchParams.get("caseNumber") ?? undefined;
  const caseRecno = caseRecnoStr ? Number(caseRecnoStr) : undefined;

  if (!caseRecno && !caseNumber) {
    return NextResponse.json(
      { error: "caseRecno or caseNumber is required" },
      { status: 400 }
    );
  }

  try {
    const contacts = await getCaseContacts({ caseRecno, caseNumber });
    return NextResponse.json({ ok: true, contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, contacts: [], error: message });
  }
}
