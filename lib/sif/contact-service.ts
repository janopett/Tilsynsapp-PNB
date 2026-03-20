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
  const enterpriseRecno = input.enterprise ? (parseEnterpriseRecno(input.enterprise) ?? undefined) : undefined;

  // 1. Try ExternalId lookup first — most reliable.
  let existing = await lookupContactPersonByExternalId(input.externalId);

  // 2. If not found by ExternalId, fall back to name-based lookup.
  //    This handles contacts created before ExternalId was introduced, or cases
  //    where SIF didn't persist the ExternalId on the contact record.
  if (!existing) {
    existing = await lookupContactPersonByName(input.firstName, input.lastName, enterpriseRecno);
    if (existing) {
      console.info("[SIF] Found contact by name (ExternalId lookup returned nothing)", {
        externalId: input.externalId,
        matchedRecno: existing.Recno,
        matchedName: existing.Name,
      });
    }
  }

  if (existing) {
    const sameEnterprise = contactEnterpriseMatches(existing, input.enterprise);
    console.info("[SIF] Contact match", {
      externalId: input.externalId,
      storedRecno: existing.Recno,
      storedName: existing.Name,
      storedEnterpriseRecno: existing.EnterpriseRecno,
      inputEnterprise: input.enterprise,
      sameEnterprise,
    });

    if (sameEnterprise) {
      // Same person, same employer: update Title if it differs, return existing Recno.
      if (input.title && existing.Title !== input.title) {
        await callSynchronize({
          externalId: input.externalId,
          // Prefer stored names so PNB recognises this as an update, not a new record.
          firstName: existing.FirstName ?? input.firstName,
          lastName: existing.LastName ?? input.lastName,
          // Always use the stored recno for the enterprise — the caller may have passed a
          // plain name string that resolves to undefined, which would cause 360° to create
          // a new contact instead of updating the existing one.
          enterprise:
            existing.EnterpriseRecno !== undefined
              ? `recno:${existing.EnterpriseRecno}`
              : input.enterprise,
          title: input.title,
        });
      }
      return existing.Recno;
    }

    // Same person, different employer → person changed jobs.
    const scopedId = `${input.externalId}:e:${deriveEnterpriseKey(input.enterprise)}`;
    console.info("[SIF] Enterprise changed — creating new contact with scoped ExternalId", {
      originalId: input.externalId,
      scopedId,
      inputEnterprise: input.enterprise,
    });
    return callSynchronize({ ...input, externalId: scopedId });
  }

  // Not found by ExternalId or name: create new contact.
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
      { ExternalId: externalId, MaxRows: 1 },
      undefined,
      true
    );
    console.info("[SIF] GetContactPersons(ExternalId) raw result", { externalId, result });
    return result.Successful && result.ContactPersons?.length ? result.ContactPersons[0] : null;
  } catch (err) {
    console.warn("[SIF] GetContactPersons(ExternalId) lookup failed (non-fatal)", {
      externalId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Fallback: search GetContactPersons by full name when ExternalId lookup returns nothing.
 * Returns the best match if exactly one active contact with that name is found,
 * or the one that also matches enterprise recno when multiple candidates exist.
 * Returns null if no match or ambiguous.
 */
async function lookupContactPersonByName(
  firstName?: string,
  lastName?: string,
  enterpriseRecno?: number
): Promise<SifContactPersonResult | null> {
  const nameParts = [firstName, lastName].filter(Boolean);
  if (!nameParts.length) return null;
  // Try "Fornavn Etternavn" first, then just lastName as a fallback search term.
  const queries = [
    nameParts.join(" "),
    ...(nameParts.length > 1 ? [nameParts[nameParts.length - 1]] : []),
  ];

  for (const nameQuery of queries) {
    try {
      const result = await sifRpcCall<SifGetContactPersonsQuery, SifGetContactPersonsResult>(
        "ContactService",
        "GetContactPersons",
        { Name: nameQuery, Active: true, MaxRows: 20 },
        undefined,
        true
      );
      console.info("[SIF] GetContactPersons(Name) raw result", { nameQuery, result });
      if (!result.Successful || !result.ContactPersons?.length) continue;

      const candidates = result.ContactPersons;

      // If we have an enterprise recno, prefer candidates linked to that enterprise.
      if (enterpriseRecno !== undefined) {
        const withEnterprise = candidates.filter((c) => c.EnterpriseRecno === enterpriseRecno);
        if (withEnterprise.length === 1) return withEnterprise[0];
        if (withEnterprise.length > 1) {
          console.info("[SIF] Ambiguous name+enterprise match, skipping", { nameQuery, count: withEnterprise.length });
          return null;
        }
      }

      // No enterprise filter or no match with enterprise: accept single exact-name match.
      const fullName = nameParts.join(" ").toLowerCase();
      const exact = candidates.filter((c) => {
        const stored = (c.Name ?? [c.FirstName, c.LastName].filter(Boolean).join(" ")).toLowerCase();
        return stored === fullName;
      });
      if (exact.length === 1) return exact[0];
    } catch (err) {
      console.warn("[SIF] GetContactPersons(Name) lookup failed (non-fatal)", {
        nameQuery,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return null;
}

/**
 * True if the stored contact is linked to the same enterprise as `enterprise`.
 * Only compares when both sides provide a reliable recno ("recno:XXXX" format).
 * Plain name strings are not used as a discriminator: PNB may store the name
 * differently (capitalisation, abbreviation, etc.), so a name mismatch does NOT
 * mean the person changed employer — we default to "same employer" to prevent
 * spurious duplicate contacts.
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
  // Cannot reliably compare: assume same employer to avoid duplicate creation.
  return true;
}

function parseEnterpriseRecno(enterprise: string): number | null {
  // "recno:12345" format (used by production flow)
  const m = enterprise.match(/^recno:(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  // Bare integer (e.g. typed directly in the admin test page)
  const bare = enterprise.trim();
  if (/^\d+$/.test(bare)) return parseInt(bare, 10);
  return null;
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
  // 360° resolves Enterprise via a Contact lookup (ExternalID or Referencenumber).
  // Must use "recno:XXXX" syntax — a bare integer is treated as an ExternalID string
  // lookup and throws LookupException. Plain name strings are also not supported.
  let enterpriseForSif: string | undefined;
  if (input.enterprise) {
    const recno = parseEnterpriseRecno(input.enterprise);
    if (recno !== null) {
      enterpriseForSif = `recno:${recno}`; // "recno:XXXX" tells 360° to look up by recno directly
    }
    // Plain name → omit; better to have no enterprise than a failed creation.
  }

  const payload: SifSynchronizeContactPersonInput = {
    ExternalId: input.externalId,
    FirstName: input.firstName || undefined,
    LastName: input.lastName || undefined,
    Enterprise: enterpriseForSif,
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
