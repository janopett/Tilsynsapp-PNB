import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getCaseContacts } from "@/lib/sif/contact-service";

// ── GET /api/sif/case-contacts ────────────────────────────────────────────────
// Returns contacts for a case. Accepts ?caseRecno=N or ?caseNumber=2024/1234
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

  const caseRecno = caseRecnoStr ? Number(caseRecnoStr) : undefined;

  try {
    const contacts = await getCaseContacts({ caseRecno, caseNumber: caseNumber ?? undefined });
    return NextResponse.json({ ok: true, contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
