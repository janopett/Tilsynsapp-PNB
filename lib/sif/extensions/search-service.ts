/**
 * SearchService extension.
 *
 * Wraps SearchService/Search (keyword → recnos) and builds higher-level
 * helpers on top of it.
 *
 * Note: The raw SIF SearchService/Search response only returns Recnos —
 * a list of integer record numbers for matching items. To get usable data,
 * the recnos must be resolved via GetDocuments or GetCases individually.
 * The high-level helpers below do this automatically.
 *
 * For simple document search within a known case, prefer
 * searchDocumentsInCase() which uses GetDocuments Title-filter directly
 * and is more reliable (no recno resolution step needed).
 */

import type { SifCase } from "@/types";
import { findCaseInSif } from "../case-service";
import { sifRpcCall } from "../client";
import type {
  SifDocumentInCase,
  SifGetCasesQuery,
  SifGetCasesResult,
  SifGetDocumentsQuery,
  SifGetDocumentsResult,
  SifSearchQuery,
  SifSearchResult,
} from "../types";

// ── Public types ───────────────────────────────────────────────────────────

export type SearchEntity = "Document" | "Case" | "Contact" | string;

export interface RawSearchResult {
  recnos: number[];
  total: number;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Raw wrapper around SearchService/Search.
 * Returns a list of record numbers for the matching entity type.
 * Entity examples: "Document", "Case", "Contact".
 *
 * Use the higher-level helpers below unless you need the raw recnos.
 */
export async function searchSif(
  keyword: string,
  entity?: SearchEntity,
  correlationId?: string
): Promise<RawSearchResult> {
  const result = await sifRpcCall<SifSearchQuery, SifSearchResult>(
    "SearchService",
    "Search",
    { SearchKeyword: keyword, Entity: entity },
    correlationId
  );

  if (!result.Successful) {
    console.warn("[SIF] SearchService/Search failed", {
      correlationId,
      keyword,
      entity,
      error: result.ErrorMessage ?? result.ErrorDetails,
    });
    return { recnos: [], total: 0 };
  }

  const recnos = result.Recnos ?? [];
  return { recnos, total: recnos.length };
}

/**
 * Search for documents by title within a specific case.
 *
 * Uses GetDocuments with a Title wildcard filter — more reliable than
 * SearchService because it returns full document objects directly.
 * The keyword is automatically wrapped in % wildcards.
 */
export async function searchDocumentsInCase(
  caseNumber: string,
  keyword: string,
  maxResults = 25,
  correlationId?: string
): Promise<SifDocumentInCase[]> {
  const result = await sifRpcCall<SifGetDocumentsQuery, SifGetDocumentsResult>(
    "DocumentService",
    "GetDocuments",
    {
      CaseNumber: caseNumber,
      Title: `%${keyword}%`,
      MaxReturnedDocuments: maxResults,
      SortCriterion: "RecnoDescending",
    },
    correlationId
  );

  if (!result.Successful) return [];
  return result.Documents ?? [];
}

/**
 * Search for cases by keyword using SearchService/Search with Entity="Case".
 * Resolves each returned recno to a full SifCase via GetCases.
 *
 * Falls back gracefully — cases that fail to resolve are skipped.
 * For a simpler case search, prefer searchCasesInSif() in case-service.ts
 * which searches by CaseNumber and Title simultaneously.
 */
export async function searchCasesGlobal(
  keyword: string,
  maxResults = 10,
  correlationId?: string
): Promise<SifCase[]> {
  const { recnos } = await searchSif(keyword, "Case", correlationId);
  if (recnos.length === 0) return [];

  const settled = await Promise.allSettled(
    recnos.slice(0, maxResults).map((recno) =>
      sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
        "CaseService",
        "GetCases",
        { Recno: recno, MaxReturnedCases: 1 },
        correlationId
      ).then((res) => {
        if (!res.Successful || !res.Cases?.length) return null;
        const raw = res.Cases[0];
        return {
          recno: raw.Recno,
          caseNumber: raw.CaseNumber,
          title: raw.Title,
          url: raw.URL || undefined,
          uid: raw.UID,
          uidOrigin: raw.UIDOrigin,
          raw,
        } satisfies SifCase;
      })
    )
  );

  return settled.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
}

/**
 * Search for documents globally (across all cases) using SearchService.
 * Resolves each recno to a document via GetDocuments.
 *
 * Note: This makes one GetDocuments call per returned recno — use sparingly
 * or with a low maxResults limit.
 */
export async function searchDocumentsGlobal(
  keyword: string,
  maxResults = 10,
  correlationId?: string
): Promise<SifDocumentInCase[]> {
  const { recnos } = await searchSif(keyword, "Document", correlationId);
  if (recnos.length === 0) return [];

  const settled = await Promise.allSettled(
    recnos
      .slice(0, maxResults)
      .map((recno) =>
        sifRpcCall<SifGetDocumentsQuery, SifGetDocumentsResult>(
          "DocumentService",
          "GetDocuments",
          { Recno: recno, MaxReturnedDocuments: 1 },
          correlationId
        ).then((res) => res.Documents?.[0] ?? null)
      )
  );

  return settled
    .filter((r): r is PromiseFulfilledResult<SifDocumentInCase | null> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((v): v is SifDocumentInCase => v !== null);
}
