import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { findCaseInSif } from "@/lib/sif/case-service";
import { getCaseContacts } from "@/lib/sif/contact-service";

// ── GET /api/sif/case-contacts ────────────────────────────────────────────────
// Returns contacts for a specific case. Accepts ?caseRecno=N or ?caseNumber=...
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const caseRecnoStr = searchParams.get("caseRecno");
  const caseNumber = searchParams.get("caseNumber") ?? undefined;
  let caseRecno = caseRecnoStr ? Number(caseRecnoStr) : undefined;

  if (!caseRecno && !caseNumber) {
    return NextResponse.json({ error: "caseRecno or caseNumber is required" }, { status: 400 });
  }

  // Look up the case recno when not provided — GetCaseContacts works more
  // reliably with CaseRecno than with CaseNumber on some SIF instances.
  if (!caseRecno && caseNumber) {
    try {
      const sifCase = await findCaseInSif({ caseNumber });
      caseRecno = sifCase.recno;
    } catch {
      // Continue without recno; contact-service will try caseNumber
    }
  }

  try {
    const contacts = await getCaseContacts({ caseRecno, caseNumber });
    return NextResponse.json({ ok: true, contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, contacts: [], error: message });
  }
}
