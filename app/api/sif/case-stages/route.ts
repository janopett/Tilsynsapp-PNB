import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { findCaseInSif } from "@/lib/sif/case-service";
import type { SifCaseStage } from "@/types";

// ── GET /api/sif/case-stages?caseNumber=... ───────────────────────────────────
// Returns stages connected to a case (requires IncludeStages on 360° v6.4+).
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const caseNumber = new URL(req.url).searchParams.get("caseNumber") ?? undefined;
  if (!caseNumber) {
    return NextResponse.json({ error: "caseNumber is required" }, { status: 400 });
  }

  try {
    const sifCase = await findCaseInSif({ caseNumber });
    const stages: SifCaseStage[] = sifCase.stages ?? [];
    return NextResponse.json({ ok: true, stages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, stages: [], error: message });
  }
}
