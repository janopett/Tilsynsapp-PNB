import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getCaseContacts } from "@/lib/sif/contact-service";
import { findCaseInSif } from "@/lib/sif/case-service";

// ── GET /api/sif/case-contacts ────────────────────────────────────────────────
// Returns contacts for a case. Accepts ?caseRecno=N or ?caseNumber=TILSYN-26/00007
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const caseRecnoStr = searchParams.get("caseRecno");
  const caseNumber = searchParams.get("caseNumber");

  if (!caseRecnoStr && !caseNumber) {
    return NextResponse.json(
      { error: "caseRecno or caseNumber is required" },
      { status: 400 }
    );
  }

  try {
    // Resolve caseNumber → recno so ContactService filters correctly
    let caseRecno = caseRecnoStr ? Number(caseRecnoStr) : undefined;
    if (!caseRecno && caseNumber) {
      const sifCase = await findCaseInSif({ caseNumber });
      caseRecno = sifCase.recno;
    }

    const contacts = await getCaseContacts({ caseRecno });
    return NextResponse.json({ ok: true, contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
