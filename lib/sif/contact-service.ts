// ============================================================
// SIF ContactService - fetch contacts on a specific case
//
// Strategy 1: CaseService/GetCaseContacts  (returns only case-linked contacts)
// Strategy 2: CaseService/GetCases with IncludeCaseContacts + IncludeReferringCases
//
// GetCaseContacts throws IndexOutOfRangeException on some SIF instances
// when the case has no contacts — we catch this and fall back to
// extracting the responsible person from the case data.
// ============================================================

import { sifRpcCall } from "./client";
import type {
  SifGetCaseContactsQuery,
  SifGetCaseContactsResult,
  SifCaseContact,
  SifGetCasesQuery,
  SifGetCasesResult,
  SifGetEnterpriseQuery,
  SifGetEnterpriseResult,
  SifEnterpriseResult,
  SifSynchronizeContactPersonInput,
  SifSynchronizeContactPersonResult,
} from "./types";
import type { SifContact } from "@/types";

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Fetch contacts linked to a specific case.
 *
 * Strategy:
 * 1. Call CaseService/GetCaseContacts – returns only contacts on this case.
 * 2. If that fails or returns nothing, fall back to:
 *    a. Contacts[] embedded in CaseService/GetCases
 *    b. ResponsiblePerson from the case as a synthetic contact
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
  // Try CaseRecno first (some SIF instances throw IndexOutOfRangeException
  // with CaseNumber). If that returns empty, retry with CaseNumber — some
  // instances don't support CaseRecno for this endpoint.
  const tryGetCaseContacts = async (query: SifGetCaseContactsQuery) => {
    const result = await sifRpcCall<SifGetCaseContactsQuery, SifGetCaseContactsResult>(
      "CaseService",
      "GetCaseContacts",
      query,
      correlationId
    );
    if (result.Successful && result.Contacts && result.Contacts.length > 0) {
      return mapCaseContacts(result.Contacts);
    }
    return null;
  };

  // 1a) Try with CaseRecno
  if (caseRecno) {
    try {
      const contacts = await tryGetCaseContacts({ CaseRecno: caseRecno });
      if (contacts) return contacts;
    } catch (err) {
      console.warn("[SIF] GetCaseContacts(CaseRecno) failed", err);
    }
  }

  // 1b) Try with CaseNumber (covers instances that don't support CaseRecno)
  if (caseNumber) {
    try {
      const contacts = await tryGetCaseContacts({ CaseNumber: caseNumber });
      if (contacts) return contacts;
    } catch (err) {
      console.warn("[SIF] GetCaseContacts(CaseNumber) failed", err);
    }
  }

  // ── Strategy 2: GetCases with IncludeCaseContacts + IncludeReferringCases ──
  if (!caseNumber) return [];

  try {
    const query: SifGetCasesQuery = {
      CaseNumber: caseNumber,
      MaxResults: 1,
      IncludeReferringCases: true,
      IncludeCaseContacts: true,
    };
    const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
      "CaseService",
      "GetCases",
      query,
      correlationId
    );

    if (!result.Successful || !result.Cases?.length) return [];

    const c = result.Cases[0];

    // Only return explicit case contacts (external parties listed under Contacts).
    // ResponsiblePerson and ResponsibleEnterprise are internal SIF users and
    // should not appear in the applicant/participant dropdowns.
    if (c.Contacts?.length) {
      return mapCaseContacts(c.Contacts);
    }

    return [];
  } catch (err) {
    console.warn("[SIF] GetCases contacts fallback failed", err);
  }

  return [];
}

// ── Enterprise search ──────────────────────────────────────────────────────────

/**
 * Search for enterprises (foretak) in SIF/PNB by name or org.nr.
 * Uses wildcard matching (%query%) for partial name matching,
 * consistent with how cases are searched in searchCasesInSif.
 * If the query looks like an org.nr (9 digits), searches by EnterpriseNumber as well.
 */
export async function searchEnterprises(query: string): Promise<SifEnterpriseResult[]> {
  const q = query.trim();
  if (!q) return [];

  // Detect org.nr: 9 consecutive digits (possibly with spaces/dashes stripped)
  const digitsOnly = q.replace(/[\s-]/g, "");
  const isOrgNr = /^\d{9}$/.test(digitsOnly);

  const queries: SifGetEnterpriseQuery[] = isOrgNr
    ? [{ EnterpriseNumber: digitsOnly, MaxRows: 10 }]
    : [{ Name: `%${q}%`, MaxRows: 10 }];

  const results = await Promise.allSettled(
    queries.map((payload) =>
      sifRpcCall<SifGetEnterpriseQuery, SifGetEnterpriseResult>(
        "ContactService",
        "GetEnterprises",
        payload
      )
    )
  );

  const seen = new Set<number>();
  const enterprises: SifEnterpriseResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.Successful && r.value.Enterprises) {
      for (const e of r.value.Enterprises) {
        if (!seen.has(e.Recno)) {
          seen.add(e.Recno);
          enterprises.push(e);
        }
      }
    }
  }
  return enterprises;
}

// ── SynchronizeContactPerson ───────────────────────────────────────────────────

/**
 * Create or update a contact person in PNB via ContactService/SynchronizeContactPerson.
 * SIF upserts on ExternalId: creates the person if new, updates if already present.
 *
 * Enterprise should be:
 *   - "recno:XXXX" when we have the PNB enterprise recno (from GetEnterprises search)
 *   - Plain company name string as fallback
 *
 * Returns the PNB Recno of the created/updated contact person.
 * This Recno can then be used as a copy recipient (kopimottaker) on CreateDocument.
 */
export async function synchronizeContactPerson(input: {
  externalId: string;
  firstName?: string;
  lastName?: string;
  enterprise?: string;
  /** Maps to the Title field in 360° — use the person's role (e.g. "Brannvernleder") */
  title?: string;
}): Promise<number> {
  const payload: SifSynchronizeContactPersonInput = {
    ExternalId: input.externalId,
    FirstName: input.firstName || undefined,
    LastName: input.lastName || undefined,
    Enterprise: input.enterprise || undefined,
    Title: input.title || undefined,
    Active: true,
  };

  const result = await sifRpcCall<SifSynchronizeContactPersonInput, SifSynchronizeContactPersonResult>(
    "ContactService",
    "SynchronizeContactPerson",
    payload,
    undefined,
    true // write operation: wrap in {"parameter": ...}
  );

  if (!result.Successful || result.Recno === undefined) {
    throw new Error(
      result.ErrorMessage ?? result.ErrorDetails ?? "SynchronizeContactPerson returnerte ingen Recno"
    );
  }

  return result.Recno;
}

function mapCaseContacts(raw: SifCaseContact[]): SifContact[] {
  return raw.map((c) => ({
    recno: c.Recno,
    name: c.ContactName ?? `Kontakt ${c.Recno}`,
    role: c.Role,
    roleDescription: c.RoleDescription,
    email: c.Email,
    phone: c.Phone,
  }));
}
