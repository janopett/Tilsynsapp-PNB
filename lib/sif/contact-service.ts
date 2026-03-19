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
  SifGetContactPersonsQuery,
  SifGetContactPersonsResult,
  SifContactPersonResult,
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
 *
 * Logic (in order):
 * 1. Look up the contact in PNB by ExternalId (GetContactPersons).
 * 2. If found AND name matches (case-insensitive) AND same enterprise
 *    → use existing Recno; update Title via SynchronizeContactPerson if it changed.
 *    No new contact is created — this covers "only role differs" scenario.
 * 3. If found AND name matches AND enterprise DIFFERS
 *    → the person changed employer; create a new contact linked to the new enterprise
 *    using an enterprise-scoped ExternalId so the old record is left untouched.
 * 4. Not found (or name mismatch) → call SynchronizeContactPerson normally.
 *
 * Enterprise should be "recno:XXXX" when the PNB recno is known, plain name otherwise.
 * Returns the PNB Recno to use as a copy recipient (kopimottaker) on CreateDocument.
 */
export async function synchronizeContactPerson(input: {
  externalId: string;
  firstName?: string;
  lastName?: string;
  enterprise?: string;
  /** Maps to the Title field in 360° — use the person's role (e.g. "Brannvernleder") */
  title?: string;
}): Promise<number> {
  // Pre-check: look up existing contact by ExternalId.
  // Gracefully skipped if GetContactPersons is unavailable on this SIF instance.
  const existing = await lookupContactPersonByExternalId(input.externalId);

  if (existing) {
    const namesMatch = contactNamesMatch(existing, input.firstName, input.lastName);
    const sameEnterprise = contactEnterpriseMatches(existing, input.enterprise);

    if (namesMatch && sameEnterprise) {
      // Same person, same employer: update Title if it differs, then return existing Recno.
      if (input.title && existing.Title !== input.title) {
        await callSynchronize({
          externalId: input.externalId,
          // Re-send the stored name so PNB doesn't misinterpret this as a new person.
          firstName: existing.FirstName,
          lastName: existing.LastName,
          enterprise: input.enterprise,
          title: input.title,
        });
      }
      return existing.Recno;
    }

    if (namesMatch && !sameEnterprise) {
      // Same person, changed employer → create a new contact for the new employer.
      // Use an enterprise-scoped ExternalId to keep old and new employer records separate.
      const scopedId = `${input.externalId}:e:${deriveEnterpriseKey(input.enterprise)}`;
      return callSynchronize({ ...input, externalId: scopedId });
    }
  }

  // Not found (or name mismatch): create / update via SynchronizeContactPerson.
  return callSynchronize(input);
}

/** Lookup a contact person in PNB by ExternalId. Returns null on any failure. */
async function lookupContactPersonByExternalId(
  externalId: string
): Promise<SifContactPersonResult | null> {
  try {
    const result = await sifRpcCall<SifGetContactPersonsQuery, SifGetContactPersonsResult>(
      "ContactService",
      "GetContactPersons",
      { ExternalId: externalId, MaxRows: 1 }
    );
    return result.Successful && result.ContactPersons?.length ? result.ContactPersons[0] : null;
  } catch {
    return null; // Non-fatal: fall through to SynchronizeContactPerson
  }
}

/** True if the stored contact's name matches firstName + lastName (case-insensitive). */
function contactNamesMatch(
  existing: SifContactPersonResult,
  firstName?: string,
  lastName?: string
): boolean {
  const normalize = (s?: string) => (s ?? "").trim().toLowerCase();
  const inputFull = [firstName, lastName].filter(Boolean).map(normalize).join(" ");
  if (!inputFull) return true; // no name supplied → can't distinguish → treat as match
  const storedFull =
    existing.FullName
      ? normalize(existing.FullName)
      : [existing.FirstName, existing.LastName].filter(Boolean).map(normalize).join(" ");
  return storedFull === inputFull;
}

/**
 * True if the stored contact is linked to the same enterprise as `enterprise`.
 * Compares by recno when the enterprise string is in "recno:XXXX" format,
 * otherwise falls back to case-insensitive name comparison.
 * If no enterprise is supplied, always returns true (no employer restriction).
 */
function contactEnterpriseMatches(
  existing: SifContactPersonResult,
  enterprise?: string
): boolean {
  if (!enterprise) return true;
  const recno = parseEnterpriseRecno(enterprise);
  if (recno !== null && existing.EnterpriseRecno !== undefined) {
    return existing.EnterpriseRecno === recno;
  }
  // Plain name comparison as fallback
  return (existing.Enterprise ?? "").trim().toLowerCase() ===
    enterprise.trim().toLowerCase();
}

function parseEnterpriseRecno(enterprise: string): number | null {
  const m = enterprise.match(/^recno:(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

function deriveEnterpriseKey(enterprise?: string): string {
  if (!enterprise) return "none";
  const recno = parseEnterpriseRecno(enterprise);
  if (recno !== null) return String(recno);
  return enterprise.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Raw SynchronizeContactPerson call — no pre-checks. */
async function callSynchronize(input: {
  externalId: string;
  firstName?: string;
  lastName?: string;
  enterprise?: string;
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
