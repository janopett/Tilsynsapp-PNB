/**
 * Referred-cases extension.
 *
 * Fetches the cases that refer to a given case (IncludeReferringCases: true),
 * then retrieves their documents with embedded file metadata.
 *
 * Typical use: a ULOV/TILSYN case refers to a BYGG case. Use
 * getReferredCasesWithDocuments() to pull building-permit files from the
 * referred BYGG case so they can be attached to the inspection document.
 */

import { sifRpcCall } from "../client";
import type {
  SifGetCasesQuery,
  SifGetCasesResult,
  SifGetDocumentsQuery,
  SifGetDocumentsResult,
  SifDocumentInCase,
  SifFileMetadata,
} from "../types";

// ── Public types ───────────────────────────────────────────────────────────

export interface ReferringCase {
  caseNumber: string;
  title: string;
  /** Relation type as returned by SIF, e.g. "Referanse" */
  relation: string;
  notes?: string;
}

/**
 * SifDocumentInCase extended with the `Files` array that GetDocuments
 * returns when IncludeFiles: true (not modelled in the base interface).
 */
export interface DocumentWithFiles extends SifDocumentInCase {
  files: SifFileMetadata[];
}

export interface ReferredCaseWithDocuments extends ReferringCase {
  documents: DocumentWithFiles[];
}

// ── Internal raw types ─────────────────────────────────────────────────────

type RawReferringCase = {
  CaseNumber: string;
  Title?: string;
  Relation?: string;
  Notes?: string;
};

type RawDocWithFiles = SifDocumentInCase & { Files?: SifFileMetadata[] };

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Return all cases that refer to the given case number.
 * Calls CaseService/GetCases with IncludeReferringCases: true.
 */
export async function getReferringCases(
  caseNumber: string,
  correlationId?: string
): Promise<ReferringCase[]> {
  const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
    "CaseService",
    "GetCases",
    { CaseNumber: caseNumber, MaxReturnedCases: 1, IncludeReferringCases: true },
    correlationId
  );

  if (!result.Successful || !result.Cases?.length) return [];

  const referring =
    (result.Cases[0].ReferringCases as RawReferringCase[] | null | undefined) ?? [];

  return referring.map((r) => ({
    caseNumber: r.CaseNumber,
    title: r.Title ?? "",
    relation: r.Relation ?? "",
    notes: r.Notes || undefined,
  }));
}

/**
 * Return all documents for a case, with file metadata embedded.
 * Calls DocumentService/GetDocuments with IncludeFiles: true.
 */
export async function getDocumentsWithFiles(
  caseNumber: string,
  maxDocuments = 25,
  correlationId?: string
): Promise<DocumentWithFiles[]> {
  const result = await sifRpcCall<SifGetDocumentsQuery, SifGetDocumentsResult>(
    "DocumentService",
    "GetDocuments",
    {
      CaseNumber: caseNumber,
      MaxReturnedDocuments: maxDocuments,
      SortCriterion: "RecnoDescending",
      IncludeFiles: true,
    },
    correlationId
  );

  if (!result.Successful || !result.Documents?.length) return [];

  return (result.Documents as RawDocWithFiles[]).map((d) => ({
    ...d,
    files: d.Files ?? [],
  }));
}

/**
 * Filter documents by their Status field (e.g. "J" = journalført, "F" = ferdig).
 * Status codes are instance-specific — inspect getDocumentsWithFiles() results
 * to discover which codes your 360° instance uses.
 */
export function filterDocumentsByStatus(
  docs: DocumentWithFiles[],
  status: string
): DocumentWithFiles[] {
  return docs.filter((d) => d.Status === status);
}

/**
 * Filter the Files inside each document by StatusCode.
 * Returns a new array of documents where each document only contains
 * files matching the given status code.
 * Documents that have no matching files are excluded.
 */
export function filterFilesByStatusCode(
  docs: DocumentWithFiles[],
  statusCode: string
): DocumentWithFiles[] {
  return docs
    .map((d) => ({ ...d, files: d.files.filter((f) => f.StatusCode === statusCode) }))
    .filter((d) => d.files.length > 0);
}

/**
 * For a given case, find all its referring cases and fetch their documents.
 * Fetches all referred cases in parallel; any that fail are silently skipped.
 *
 * @example
 * const referred = await getReferredCasesWithDocuments("ULOV-25/00008");
 * // referred[0].caseNumber === "BYGG-25/00388"
 * // referred[0].documents[0].files[0].URL → downloadable file path
 */
export async function getReferredCasesWithDocuments(
  caseNumber: string,
  options?: {
    maxDocumentsPerCase?: number;
    correlationId?: string;
  }
): Promise<ReferredCaseWithDocuments[]> {
  const { maxDocumentsPerCase = 25, correlationId } = options ?? {};

  const referringCases = await getReferringCases(caseNumber, correlationId);
  if (referringCases.length === 0) return [];

  const settled = await Promise.allSettled(
    referringCases.map(async (rc) => {
      const documents = await getDocumentsWithFiles(
        rc.caseNumber,
        maxDocumentsPerCase,
        correlationId
      );
      return { ...rc, documents } satisfies ReferredCaseWithDocuments;
    })
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<ReferredCaseWithDocuments> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}
