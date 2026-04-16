import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import { sifRpcCall } from "@/lib/sif/client";
import type { SifGetCasesQuery, SifGetCasesResult, SifCaseResult } from "@/lib/sif/types";

const MAX_PAGES = 20;
const PAGE_SIZE = 50;

export interface PnbCaseItem {
  recno: number;
  caseNumber: string;
  title: string;
  status?: string;
  date?: string;
  lastChangedDate?: string;
  caseTypeDescription?: string;
  url?: string;
  contacts: Array<{
    name: string;
    role?: string;
    roleDescription?: string;
    email?: string;
  }>;
  estates: Array<{
    estateNumber?: string;
    address?: string;
  }>;
  stages: Array<{
    title?: string;
    stageType?: string;
    stageStatus?: string;
    deadlineDate?: string;
    remainingDays?: number;
  }>;
}

function mapCase(raw: SifCaseResult, baseUrl = ""): PnbCaseItem {
  return {
    recno: raw.Recno,
    caseNumber: raw.CaseNumber,
    title: raw.Title,
    status: raw.Status,
    date: raw.Date,
    lastChangedDate: raw.LastChangedDate,
    caseTypeDescription: raw.CaseTypeDescription,
    url: raw.URL
      ? raw.URL.startsWith("/")
        ? `${baseUrl}${raw.URL}`
        : raw.URL
      : undefined,
    contacts: (raw.Contacts ?? []).map((c) => ({
      name: c.ContactName ?? "",
      role: c.Role,
      roleDescription: c.RoleDescription,
      email: c.Email,
    })),
    estates: (raw.CaseEstates ?? []).map((e) => ({
      estateNumber: e.EstateNumber,
      address: [e.Address?.StreetAddress, e.Address?.ZipCode, e.Address?.ZipPlace]
        .filter(Boolean)
        .join(" "),
    })),
    stages: (raw.Stages ?? []).map((s) => ({
      title: s.Title,
      stageType: s.StageType?.Description,
      stageStatus: s.StageStatus?.Description,
      deadlineDate: s.DeadlineDate,
      remainingDays: s.RemainingDays,
    })),
  };
}

async function fetchPage(page: number): Promise<SifGetCasesResult> {
  return sifRpcCall<SifGetCasesQuery, SifGetCasesResult>("CaseService", "GetCases", {
    MaxReturnedCases: PAGE_SIZE,
    IncludeCaseContacts: true,
    IncludeCaseEstates: true,
    IncludeStages: true,
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
      .map((c) => mapCase(c, baseUrl));

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
