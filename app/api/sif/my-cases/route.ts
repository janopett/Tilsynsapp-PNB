import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import { sifRpcCall } from "@/lib/sif/client";
import { mapPnbCase } from "@/lib/sif/pnb-case-mapper";
import type { SifGetCasesQuery, SifGetCasesResult, SifCaseResult } from "@/lib/sif/types";
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
    SortCriterion: "RecnoDescending",
    Page: page,
  });
}

// ── GET /api/sif/my-cases ────────────────────────────────────────────────────
// Fetches all PNB cases where ResponsiblePersonName matches the logged-in user.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { user } = auth;
  const meta = user.user_metadata ?? {};
  const fullName: string =
    meta.full_name ??
    [meta.first_name, meta.last_name].filter(Boolean).join(" ") ??
    "";

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
