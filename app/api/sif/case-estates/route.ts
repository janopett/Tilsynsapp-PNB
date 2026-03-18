import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { getCaseEstates } from "@/lib/sif/estate-service";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const caseNumber = searchParams.get("caseNumber") ?? undefined;
  const caseRecnoStr = searchParams.get("caseRecno");
  const caseRecno = caseRecnoStr ? parseInt(caseRecnoStr, 10) : undefined;

  if (!caseNumber && !caseRecno) {
    return NextResponse.json(
      { error: "caseNumber or caseRecno is required" },
      { status: 400 }
    );
  }

  try {
    const estates = await getCaseEstates({ caseNumber, caseRecno });
    return NextResponse.json({ ok: true, estates });
  } catch (err) {
    console.error("[case-estates] Error", err);
    return NextResponse.json({ ok: false, estates: [], error: String(err) });
  }
}
