import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import { sifRpcCall } from "@/lib/sif/client";
import { mapPnbCase } from "@/lib/sif/pnb-case-mapper";
import type {
  SifGetCasesQuery,
  SifGetCasesResult,
  SifGetProgressPlanDetailsQuery,
  SifGetProgressPlanDetailsResult,
} from "@/lib/sif/types";

// ── GET /api/sif/pnb-case/[recno] ────────────────────────────────────────────
// Fetches a single PNB case by internal recno, with full detail.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ recno: string }> }
) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { recno: recnoStr } = await params;
  const recno = parseInt(recnoStr, 10);
  if (isNaN(recno)) {
    return NextResponse.json({ ok: false, error: "Ugyldig recno" }, { status: 400 });
  }

  const settings = await loadSifSettingsWithEnvFallback();
  if (!settings.baseUrl) {
    return NextResponse.json({ ok: false, notConfigured: true });
  }

  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  try {
    const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
      "CaseService",
      "GetCases",
      {
        Recno: recno,
        MaxReturnedCases: 1,
        IncludeCaseContacts: true,
        IncludeCaseEstates: true,
        IncludeStages: true,
        IncludeMilestones: true,
        IncludeProgressPlan: true,
      }
    );

    if (!result.Successful) {
      return NextResponse.json(
        { ok: false, error: result.ErrorMessage ?? "Ukjent feil fra SIF" },
        { status: 502 }
      );
    }

    const raw = result.Cases?.[0];
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Sak ikke funnet" }, { status: 404 });
    }

    const caseItem = mapPnbCase(raw, baseUrl);

    // Enrich with progress plan dates if not already present from GetCases
    const alreadyHasDates =
      caseItem.stages.some((s) => s.deadlineDate || s.milestones.some((m) => m.date)) ||
      caseItem.milestones.some((m) => m.date) ||
      caseItem.progressPlanDates.length > 0;

    if (!alreadyHasDates) {
      try {
        const pp = await sifRpcCall<SifGetProgressPlanDetailsQuery, SifGetProgressPlanDetailsResult>(
          "ProgressPlanService",
          "GetProgressPlanDetails",
          {
            CaseNumber: caseItem.caseNumber,
            IncludePhases: true,
            MaxReturnedActivities: 50,
          }
        );
        if (pp.Successful && pp.Activities?.length) {
          caseItem.progressPlanDates = pp.Activities.flatMap((a) => {
            const dates: string[] = [];
            if (a.DueDate) dates.push(a.DueDate);
            if (a.StartDate) dates.push(a.StartDate);
            for (const p of a.Phases ?? []) {
              if (p.DueDate) dates.push(p.DueDate);
              if (p.StartDate) dates.push(p.StartDate);
            }
            return dates;
          });
        }
      } catch {
        // Progress plan is optional — don't fail the request
      }
    }

    return NextResponse.json({ ok: true, case: caseItem });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
