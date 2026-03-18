// ============================================================
// SIF ContactService - fetch contacts on a specific case
//
// Primary:  CaseService/GetCaseContacts  (returns only case-linked contacts)
// Fallback: contacts embedded in CaseService/GetCases response
//
// The old approach (ContactService/GetContactPersons etc.) returns ALL
// contacts in the entire PNB system and is NOT used for case filtering.
// ============================================================

import { sifRpcCall } from "./client";
import type {
  SifGetCaseContactsQuery,
  SifGetCaseContactsResult,
  SifCaseContact,
  SifGetCasesQuery,
  SifGetCasesResult,
} from "./types";
import type { SifContact } from "@/types";

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Fetch contacts linked to a specific case.
 *
 * Strategy:
 * 1. Call CaseService/GetCaseContacts – returns only contacts on this case.
 * 2. If that returns nothing, fall back to contacts embedded in
 *    CaseService/GetCases (the Contacts[] array on the case result).
 *
 * Returns empty array if the case has no contacts or calls fail.
 */
export async function getCaseContacts(
  input: { caseRecno?: number; caseNumber?: string },
  correlationId?: string
): Promise<SifContact[]> {
  const { caseRecno, caseNumber } = input;
  if (!caseRecno && !caseNumber) return [];

  // ── Strategy 1: CaseService/GetCaseContacts ────────────────────────────────
  try {
    const query: SifGetCaseContactsQuery = {};
    if (caseRecno) query.CaseRecno = caseRecno;
    else if (caseNumber) query.CaseNumber = caseNumber;

    const result = await sifRpcCall<SifGetCaseContactsQuery, SifGetCaseContactsResult>(
      "CaseService",
      "GetCaseContacts",
      query,
      correlationId
    );

    if (result.Successful && result.Contacts && result.Contacts.length > 0) {
      return mapCaseContacts(result.Contacts);
    }
  } catch (err) {
    console.warn("[SIF] CaseService/GetCaseContacts failed, trying fallback", err);
  }

  // ── Strategy 2: Contacts embedded in GetCases response ────────────────────
  try {
    const query: SifGetCasesQuery = { MaxResults: 1 };
    if (caseRecno) {
      // GetCases doesn't support filtering by recno directly; skip this fallback
      // if we only have recno and strategy 1 already failed.
    } else if (caseNumber) {
      query.CaseNumber = caseNumber;
    }

    if (query.CaseNumber) {
      const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
        "CaseService",
        "GetCases",
        query,
        correlationId
      );

      if (result.Successful && result.Cases && result.Cases.length > 0) {
        const caseContacts = result.Cases[0].Contacts ?? [];
        if (caseContacts.length > 0) {
          return mapCaseContacts(caseContacts);
        }
      }
    }
  } catch (err) {
    console.warn("[SIF] GetCases contacts fallback failed", err);
  }

  return [];
}

function mapCaseContacts(raw: SifCaseContact[]): SifContact[] {
  return raw.map((c) => ({
    recno: c.Recno,
    name: c.Name ?? `Kontakt ${c.Recno}`,
    role: c.Role,
    roleDescription: c.RoleDescription,
    email: c.Email,
    phone: c.Phone,
  }));
}
