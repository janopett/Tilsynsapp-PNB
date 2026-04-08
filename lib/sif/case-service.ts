// ============================================================
// SIF CaseService - FindCase strategy
// ============================================================

import { sifRpcCall } from "./client";
import { loadSifSettingsWithEnvFallback } from "./settings";
import {
  SifCaseNotFoundError,
  SifMultipleCasesFoundError,
  SifValidationError,
} from "./errors";
import type {
  SifGetCasesQuery,
  SifGetCasesResult,
  SifCaseResult,
  SifCaseStage as RawSifCaseStage,
  SifCreateCaseInput,
  SifMutateCaseResult,
} from "./types";
import type { SifCase, SifCaseStage } from "@/types";

export interface FindCaseInput {
  caseNumber?: string;
  externalId?: string;
  externalSystem?: string;
  importedCaseNumber?: string;
  uid?: string;
  uidOrigin?: string;
  title?: string;
  correlationId?: string;
}

/**
 * Find a single case in SIF using the best available criteria.
 * Priority: caseNumber > uid > externalId > importedCaseNumber
 * Throws if 0 or >1 cases match.
 */
export async function findCaseInSif(input: FindCaseInput): Promise<SifCase> {
  const { caseNumber, externalId, externalSystem, importedCaseNumber, uid, uidOrigin, title, correlationId } = input;
  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  if (!caseNumber && !externalId && !importedCaseNumber && !uid && !title) {
    throw new SifValidationError(
      "At least one case lookup criterion must be provided (caseNumber, externalId, uid, importedCaseNumber, or title)."
    );
  }

  const query: SifGetCasesQuery = {
    MaxReturnedCases: 5,
    IncludeReferringCases: true,
    IncludeCaseContacts: true,
    IncludeCaseEstates: true,
    IncludeStages: true,
  };

  if (caseNumber) {
    query.CaseNumber = caseNumber;
  } else if (uid) {
    query.UID = uid;
    if (uidOrigin) query.UIDOrigin = uidOrigin;
  } else if (externalId) {
    query.ExternalId = {
      Id: externalId,
      Type: externalSystem,
    };
  } else if (importedCaseNumber) {
    query.ImportedCaseNumber = importedCaseNumber;
  } else if (title) {
    query.Title = title;
  }

  const criteria = JSON.stringify(query);

  console.info("[SIF] CaseService/GetCases", { correlationId, query });

  const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
    "CaseService",
    "GetCases",
    query,
    correlationId
  );

  if (!result.Successful) {
    throw new SifCaseNotFoundError(
      criteria,
      result.ErrorMessage ?? result.ErrorDetails
    );
  }

  const cases = result.Cases ?? [];
  if (cases.length === 0) {
    throw new SifCaseNotFoundError(criteria);
  }
  if (cases.length > 1) {
    throw new SifMultipleCasesFoundError(cases.length, criteria, cases);
  }

  return mapToSifCase(cases[0], baseUrl);
}

/**
 * Search for cases in SIF by partial case number or title.
 * Runs both queries in parallel and merges deduplicated results.
 */
export async function searchCasesInSif(query: string, maxResults = 10): Promise<SifCase[]> {
  if (!query.trim()) return [];
  const q = query.trim();

  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  const [byNumber, byTitle] = await Promise.allSettled([
    sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
      "CaseService", "GetCases", { CaseNumber: `%${q}%`, MaxReturnedCases: maxResults }
    ),
    sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
      "CaseService", "GetCases", { Title: `%${q}%`, MaxReturnedCases: maxResults }
    ),
  ]);

  const seen = new Set<number>();
  const results: SifCase[] = [];

  for (const settled of [byNumber, byTitle]) {
    if (settled.status === "fulfilled" && settled.value.Successful) {
      for (const c of settled.value.Cases ?? []) {
        if (!seen.has(c.Recno)) {
          seen.add(c.Recno);
          results.push(mapToSifCase(c, baseUrl));
        }
      }
    }
  }

  return results.slice(0, maxResults);
}

// ============================================================
// getCasesList — hent paginert saksliste fra SIF
// ============================================================

export interface GetCasesListOptions {
  page?: number;
  maxResults?: number;
  search?: string;
  status?: string;
  sortDescending?: boolean;
  correlationId?: string;
}

export interface GetCasesListResult {
  cases: SifCase[];
  totalCount?: number;
  totalPages?: number;
}

export async function getCasesList(
  options: GetCasesListOptions = {}
): Promise<GetCasesListResult> {
  const {
    page = 1,
    maxResults = 50,
    search,
    sortDescending = true,
    correlationId,
  } = options;

  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  const query: SifGetCasesQuery = {
    MaxReturnedCases: maxResults,
    Page: page,
    SortCriterion: sortDescending ? "RecnoDescending" : "RecnoAscending",
    IncludeCaseEstates: true,
    IncludeCaseContacts: false,
    IncludeStages: false,
  };

  if (search?.trim()) {
    // SIF støtter wildcard-søk med % på CaseNumber og Title
    query.Title = `%${search.trim()}%`;
  }

  console.info("[SIF] CaseService/GetCases (list)", { correlationId, query });

  const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
    "CaseService",
    "GetCases",
    query,
    correlationId
  );

  if (!result.Successful) {
    console.warn("[SIF] getCasesList ikke vellykket", result.ErrorMessage);
    return { cases: [] };
  }

  const cases = (result.Cases ?? []).map((c) => mapToSifCase(c, baseUrl));
  return {
    cases,
    totalCount: result.TotalCount,
    totalPages: result.TotalPageCount,
  };
}

// ============================================================
// getCasesListByNumber — søk på saksnummer-mønster
// ============================================================

export async function getCasesListByNumber(
  caseNumberPattern: string,
  maxResults = 50
): Promise<SifCase[]> {
  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
    "CaseService",
    "GetCases",
    {
      CaseNumber: `%${caseNumberPattern}%`,
      MaxReturnedCases: maxResults,
      SortCriterion: "RecnoDescending",
    }
  );

  if (!result.Successful) return [];
  return (result.Cases ?? []).map((c) => mapToSifCase(c, baseUrl));
}

// ============================================================
// createCaseInSif — opprett ny sak i Plan & Build via SIF
// ============================================================

export async function createCaseInSif(
  input: SifCreateCaseInput,
  correlationId?: string
): Promise<SifMutateCaseResult> {
  console.info("[SIF] CaseService/CreateCase", { correlationId, title: input.Title });

  const result = await sifRpcCall<SifCreateCaseInput, SifMutateCaseResult>(
    "CaseService",
    "CreateCase",
    input,
    correlationId,
    true // wrap in { parameter: ... }
  );

  return result;
}

function mapStage(s: RawSifCaseStage): SifCaseStage {
  return {
    recno: s.Recno,
    title: s.Title,
    startDate: s.StartDate,
    deadlineDate: s.DeadlineDate,
    notes: s.Notes,
    stageType: s.StageType ? { code: s.StageType.Code, description: s.StageType.Description } : undefined,
    stageStatus: s.StageStatus ? { code: s.StageStatus.Code, description: s.StageStatus.Description } : undefined,
    remainingDays: s.RemainingDays,
  };
}

function mapToSifCase(raw: SifCaseResult, baseUrl = ""): SifCase {
  const rawUrl = raw.URL ?? "";
  const url = rawUrl.startsWith("/") ? `${baseUrl}${rawUrl}` : rawUrl;
  return {
    recno: raw.Recno,
    caseNumber: raw.CaseNumber,
    title: raw.Title,
    url: url || undefined,
    uid: raw.UID,
    uidOrigin: raw.UIDOrigin,
    stages: raw.Stages?.map(mapStage),
    raw,
  };
}
