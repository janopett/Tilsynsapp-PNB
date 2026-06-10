import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sifRpcCall } from "@/lib/sif/client";
import type { PnbCaseItem } from "@/lib/sif/pnb-case-mapper";
import { mapPnbCase } from "@/lib/sif/pnb-case-mapper";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import type {
  SifCaseResult,
  SifGetCasesQuery,
  SifGetCasesResult,
  SifGetProgressPlanDetailsQuery,
  SifGetProgressPlanDetailsResult,
} from "@/lib/sif/types";

export type { PnbCaseItem } from "@/lib/sif/pnb-case-mapper";

const MAX_PAGES = 20;
const PAGE_SIZE = 50;

async function fetchPage(page: number): Promise<SifGetCasesResult> {
  return sifRpcCall<SifGetCasesQuery, SifGetCasesResult>("CaseService", "GetCases", {
    MaxReturnedCases: PAGE_SIZE,
    IncludeCaseContacts: true,
    IncludeCaseEstates: true,
    IncludeStages: true,
    IncludeMilestones: true,
    IncludeProgressPlan: true,
    SortCriterion: "RecnoDescending",
    Page: page,
  });
}

/** Extract all date strings from a progress plan details response */
function extractProgressPlanDates(result: SifGetProgressPlanDetailsResult): string[] {
  if (!result.Successful || !result.Activities?.length) return [];
  return result.Activities.flatMap((a) => {
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

/** Returns true if the case already has at least one deadline date from any source */
function hasAnyDate(c: PnbCaseItem): boolean {
  return (
    c.stages.some((s) => s.deadlineDate || s.milestones.some((m) => m.date)) ||
    c.milestones.some((m) => m.date) ||
    c.progressPlanDates.length > 0
  );
}

// ── GET /api/sif/my-cases ────────────────────────────────────────────────────
// Fetches all PNB cases where ResponsiblePersonName matches the logged-in user.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { user } = auth;
  const meta = user.user_metadata ?? {};
  const fullName: string =
    meta.full_name ?? [meta.first_name, meta.last_name].filter(Boolean).join(" ") ?? "";

  if (!fullName) {
    return NextResponse.json(
      {
        ok: false,
        error: "Brukernavnet ditt er ikke satt. Oppdater profilnavnet ditt i innstillingene.",
        noName: true,
      },
      { status: 422 }
    );
  }

  const settings = await loadSifSettingsWithEnvFallback();
  if (!settings.baseUrl) {
    return NextResponse.json({ ok: false, notConfigured: true });
  }

  const baseUrl = settings.baseUrl.replace(/\/$/, "");
  const nameLower = fullName.toLowerCase().trim();

  try {
    const firstPage = await fetchPage(1);

    if (!firstPage.Successful) {
      return NextResponse.json(
        { ok: false, error: "Feil fra SIF: " + (firstPage.ErrorMessage ?? "Ukjent feil") },
        { status: 502 }
      );
    }

    const totalPages = Math.min(firstPage.TotalPageCount ?? 1, MAX_PAGES);
    const allRaw: SifCaseResult[] = [...(firstPage.Cases ?? [])];

    if (totalPages > 1) {
      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      for (let i = 0; i < remaining.length; i += 5) {
        const batch = remaining.slice(i, i + 5);
        const results = await Promise.all(batch.map((p) => fetchPage(p)));
        for (const r of results) {
          if (r.Successful) allRaw.push(...(r.Cases ?? []));
        }
      }
    }

    const cases = allRaw
      .filter((c) => (c.ResponsiblePersonName ?? "").toLowerCase().trim() === nameLower)
      .map((c) => mapPnbCase(c, baseUrl));

    // ── Enrich cases that have no dates via GetProgressPlanDetails ────────────
    // Only called for cases where GetCases returned no deadline/milestone dates.
    const needsDates = cases.filter((c) => !hasAnyDate(c));
    if (needsDates.length > 0) {
      for (let i = 0; i < needsDates.length; i += 5) {
        const batch = needsDates.slice(i, i + 5);
        const ppResults = await Promise.allSettled(
          batch.map((c) =>
            sifRpcCall<SifGetProgressPlanDetailsQuery, SifGetProgressPlanDetailsResult>(
              "ProgressPlanService",
              "GetProgressPlanDetails",
              {
                CaseNumber: c.caseNumber,
                IncludePhases: true,
                MaxReturnedActivities: 50,
              }
            )
          )
        );
        for (let j = 0; j < batch.length; j++) {
          const r = ppResults[j];
          if (r.status === "fulfilled") {
            const dates = extractProgressPlanDates(r.value);
            if (dates.length) batch[j].progressPlanDates = dates;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      cases,
      userName: fullName,
      totalFetched: allRaw.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
