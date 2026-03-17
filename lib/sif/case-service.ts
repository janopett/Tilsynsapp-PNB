// ============================================================
// SIF CaseService - FindCase strategy
// ============================================================

import { sifRpcCall } from "./client";
import {
  SifCaseNotFoundError,
  SifMultipleCasesFoundError,
  SifValidationError,
} from "./errors";
import type {
  SifGetCasesQuery,
  SifGetCasesResult,
  SifCaseResult,
} from "./types";
import type { SifCase } from "@/types";

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

  if (!caseNumber && !externalId && !importedCaseNumber && !uid && !title) {
    throw new SifValidationError(
      "At least one case lookup criterion must be provided (caseNumber, externalId, uid, importedCaseNumber, or title)."
    );
  }

  const query: SifGetCasesQuery = { MaxResults: 5 };

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

  return mapToSifCase(cases[0]);
}

function mapToSifCase(raw: SifCaseResult): SifCase {
  return {
    recno: raw.Recno,
    caseNumber: raw.CaseNumber,
    title: raw.Title,
    url: raw.URL,
    uid: raw.UID,
    uidOrigin: raw.UIDOrigin,
    raw,
  };
}
