/**
 * SIF ContactService — case contacts and contact person synchronisation.
 *
 * This module handles two distinct responsibilities:
 *
 *  1. READING case contacts  (getCaseContacts, searchEnterprises)
 *     Fetches the people and organisations linked to a specific planning case
 *     in Plan & Build (PNB / 360°). Two SIF endpoints are tried in sequence
 *     because different 360° installations behave differently.
 *
 *  2. WRITING contact persons  (synchronizeContactPerson)
 *     Creates or updates a contact person record in PNB so it can be used as
 *     a copy recipient (kopimottaker) when archiving inspection documents.
 *     The returned PNB Recno is passed to CreateDocument as a recipient.
 *
 * Key design decision — name + enterprise as the identity key:
 *   Contacts in PNB may predate this system and therefore have no ExternalId.
 *   Using ExternalId as the primary lookup key is unreliable. Instead we look
 *   up contacts by full name (FirstName + LastName) filtered by enterprise recno,
 *   which is the same identity that a human administrator would use in PNB.
 *
 * Enterprise format:
 *   The 360° SIF adapter resolves the Enterprise field on a contact via an
 *   internal Contact lookup (by ExternalID or Referencenumber). This means:
 *   - "recno:12345" → direct recno reference; 360° resolves it immediately ✓
 *   - "12345"       → treated as an ExternalID string lookup → LookupException ✗
 *   - "Brannvesen"  → plain name; not supported by 360° → LookupException ✗
 *   Always use parseEnterpriseRecno() to convert user input before sending to SIF.
 */

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
  SifUpdateContactPersonInput,
  SifUpdateContactPersonResult,
} from "./types";
import type { SifContact } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// Case contacts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all contacts linked to a planning case in PNB.
 *
 * Two strategies are attempted in order, because different 360° installations
 * expose slightly different SIF behaviour:
 *
 *  Strategy 1 — CaseService/GetCaseContacts
 *    The dedicated endpoint for case contacts. Tried first with CaseRecno,
 *    then with CaseNumber, because some instances throw IndexOutOfRangeException
 *    when the case has no contacts and the identifier type doesn't match.
 *
 *  Strategy 2 — CaseService/GetCases with IncludeCaseContacts
 *    Fallback: fetches the full case record and extracts embedded contacts.
 *    Note: ResponsiblePerson / ResponsibleEnterprise are internal SIF users
 *    and are intentionally excluded — they should not appear in the applicant
 *    or participant dropdowns presented to inspectors.
 *
 * Returns an empty array if the case has no contacts or all calls fail.
 */
export async function getCaseContacts(
  input: { caseRecno?: number; caseNumber?: string },
  correlationId?: string
): Promise<SifContact[]> {
  const { caseRecno, caseNumber } = input;
  if (!caseRecno && !caseNumber) return [];

  // ── Strategy 1: CaseService/GetCaseContacts ──────────────────────────────

  /**
   * Attempt a single GetCaseContacts call with the given query.
   * Returns the mapped contacts on success, null if empty or unsuccessful.
   */
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

  // 1a) Prefer CaseRecno — faster when available and avoids ambiguous number formats.
  if (caseRecno) {
    try {
      const contacts = await tryGetCaseContacts({ CaseRecno: caseRecno });
      if (contacts) return contacts;
    } catch (err) {
      console.warn("[SIF] GetCaseContacts(CaseRecno) failed", err);
    }
  }

  // 1b) Fall back to CaseNumber for instances that don't support CaseRecno lookup.
  if (caseNumber) {
    try {
      const contacts = await tryGetCaseContacts({ CaseNumber: caseNumber });
      if (contacts) return contacts;
    } catch (err) {
      console.warn("[SIF] GetCaseContacts(CaseNumber) failed", err);
    }
  }

  // ── Strategy 2: GetCases with IncludeCaseContacts ────────────────────────
  // Only possible when we have a CaseNumber (GetCases does not accept CaseRecno
  // as a search parameter in all SIF versions).
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

    // Return only explicit case contacts (external parties on the Contacts list).
    // ResponsiblePerson and ResponsibleEnterprise are internal 360° users and
    // must not appear in inspector-facing dropdowns.
    if (c.Contacts?.length) {
      return mapCaseContacts(c.Contacts);
    }

    return [];
  } catch (err) {
    console.warn("[SIF] GetCases contacts fallback failed", err);
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Enterprise search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search for enterprises (foretak) in PNB by name or organisation number.
 *
 * When the query looks like a 9-digit Norwegian organisation number the search
 * is done by EnterpriseNumber for an exact match. Otherwise a wildcard name
 * search (%query%) is performed, which matches partial names anywhere in the
 * string.
 *
 * Deduplication is applied so the same enterprise recno is never returned twice
 * even if multiple SIF queries happen to return it.
 *
 * Returns up to 10 results per query.
 */
export async function searchEnterprises(query: string): Promise<SifEnterpriseResult[]> {
  const q = query.trim();
  if (!q) return [];

  // Strip spaces and dashes before checking for a 9-digit org number.
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

  // Collect unique enterprises across all query responses.
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

// ─────────────────────────────────────────────────────────────────────────────
// Contact person synchronisation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ensure a contact person exists in PNB and return their Recno.
 *
 * The Recno is used as a copy recipient (kopimottaker) on CreateDocument when
 * archiving inspection reports. It must belong to a real 360° Contact record.
 *
 * Decision flow:
 *
 *  1. Look up the person in PNB by full name (FirstName + LastName) filtered
 *     by enterprise recno. Name + enterprise is the canonical identity key
 *     because many contacts in PNB predate this system and have no ExternalId.
 *
 *  2. Contact found at the same enterprise
 *     → Call UpdateContactPerson with the known Recno to patch the record
 *       (e.g. update the Title/role field) without creating a duplicate.
 *       Returns the existing Recno.
 *
 *  3. Contact not found (name not in PNB, or found only at a different enterprise)
 *     → Call SynchronizeContactPerson to create a new contact record.
 *       Returns the newly assigned Recno.
 *
 * @param input.externalId  Our system's identifier for this contact; stored on
 *                          the 360° record for future reference.
 * @param input.enterprise  Enterprise in "recno:XXXX" or bare-integer format.
 *                          Plain text names are not forwarded to 360°.
 * @param input.title       Mapped to the Title field in 360°; typically the
 *                          person's role, e.g. "Brannvernleder".
 * @returns PNB Recno of the contact person.
 */
export async function synchronizeContactPerson(input: {
  externalId: string;
  firstName?: string;
  lastName?: string;
  enterprise?: string;
  title?: string;
}): Promise<number> {
  const enterpriseRecno = input.enterprise
    ? (parseEnterpriseRecno(input.enterprise) ?? undefined)
    : undefined;

  const existing = await lookupContactPersonByName(
    input.firstName,
    input.lastName,
    enterpriseRecno
  );

  if (existing) {
    // Contact already exists in PNB — update it in place.
    // We always call UpdateContactPerson even when only the title changed so
    // the record stays in sync without risk of creating a duplicate.
    console.info("[SIF] Contact found — updating via UpdateContactPerson", {
      recno: existing.Recno,
      name: existing.Name,
      storedTitle: existing.Title,
      inputTitle: input.title,
      enterpriseRecno: existing.EnterpriseRecno,
    });
    await callUpdateContactPerson({
      recno: existing.Recno,
      // Prefer the names already stored in PNB so 360° recognises the record.
      firstName: existing.FirstName ?? input.firstName,
      lastName: existing.LastName ?? input.lastName,
      externalId: input.externalId,
      // Always derive the enterprise from the stored recno, not from the caller's
      // input — the caller may pass a plain name which would resolve to undefined
      // and cause 360° to create a new contact instead of updating the existing one.
      enterprise:
        existing.EnterpriseRecno !== undefined
          ? `recno:${existing.EnterpriseRecno}`
          : input.enterprise,
      title: input.title,
    });
    return existing.Recno;
  }

  // No match in PNB — create a new contact record.
  console.info("[SIF] Contact not found — creating via SynchronizeContactPerson", {
    firstName: input.firstName,
    lastName: input.lastName,
    enterprise: input.enterprise,
  });
  return callSynchronize(input);
}

/**
 * Search PNB for a contact person by full name, optionally filtered by enterprise.
 *
 * Matching rules (applied in order):
 *
 *  1. Enterprise filter is provided:
 *     - Return the first candidate whose name matches exactly AND whose
 *       EnterpriseRecno equals the given enterpriseRecno.
 *     - If name matches exist but none are at this enterprise, return null.
 *       This prevents accidentally updating a different person who shares the
 *       same name but works at another company.
 *
 *  2. No enterprise filter:
 *     - Return the contact only if the name match is unambiguous (exactly one
 *       result). If multiple contacts share the name, return null so the caller
 *       falls through to creating a new record.
 *
 * Note: some SIF installations return Successful: false for empty result sets
 * rather than Successful: true with an empty array. We accept contacts from
 * the response regardless of the Successful flag to handle both behaviours.
 */
async function lookupContactPersonByName(
  firstName?: string,
  lastName?: string,
  enterpriseRecno?: number
): Promise<SifContactPersonResult | null> {
  const nameParts = [firstName, lastName].filter(Boolean);
  if (!nameParts.length) return null;

  const nameQuery = nameParts.join(" ");
  try {
    const result = await sifRpcCall<SifGetContactPersonsQuery, SifGetContactPersonsResult>(
      "ContactService",
      "GetContactPersons",
      { Name: nameQuery, Active: true, MaxRows: 20 },
      undefined,
      true
    );
    console.info("[SIF] GetContactPersons(Name) raw result", { nameQuery, result });

    // Treat missing ContactPersons as an empty result regardless of Successful flag.
    if (!result.ContactPersons?.length) return null;

    // Exact name comparison (case-insensitive). PNB may return partial matches
    // from the Name filter, so we filter down to only full-name matches here.
    const fullName = nameQuery.toLowerCase();
    const nameMatches = result.ContactPersons.filter((c) => {
      const stored = (
        c.Name ?? [c.FirstName, c.LastName].filter(Boolean).join(" ")
      ).toLowerCase();
      return stored === fullName;
    });

    if (!nameMatches.length) return null;

    if (enterpriseRecno !== undefined) {
      // Enterprise is known — only accept a match at this specific enterprise.
      const withEnterprise = nameMatches.filter(
        (c) => c.EnterpriseRecno === enterpriseRecno
      );
      if (withEnterprise.length >= 1) return withEnterprise[0];

      // The person exists in PNB but is linked to a different employer.
      // Return null so the caller creates a new contact for the correct enterprise.
      console.info("[SIF] Name matched but no contact at the given enterprise", {
        nameQuery,
        enterpriseRecno,
        candidates: nameMatches.map((c) => ({
          recno: c.Recno,
          enterpriseRecno: c.EnterpriseRecno,
        })),
      });
      return null;
    }

    // No enterprise filter — only safe to return when the name is unambiguous.
    if (nameMatches.length === 1) return nameMatches[0];

    console.info(
      "[SIF] Ambiguous name match — cannot determine which contact to update",
      { nameQuery, count: nameMatches.length }
    );
    return null;
  } catch (err) {
    console.warn("[SIF] GetContactPersons(Name) lookup failed (non-fatal)", {
      nameQuery,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse an enterprise identifier into a plain integer recno.
 *
 * Accepted formats:
 *   "recno:12345"  — explicit recno prefix used by the production archival flow
 *   "12345"        — bare integer, accepted from the admin test UI
 *
 * Plain text names (e.g. "Brannvesen Trondheim") return null and must NOT be
 * forwarded to 360°. The 360° SIF adapter would attempt to resolve them as a
 * Contact ExternalID lookup and throw a LookupException.
 */
function parseEnterpriseRecno(enterprise: string): number | null {
  const m = enterprise.match(/^recno:(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  const bare = enterprise.trim();
  if (/^\d+$/.test(bare)) return parseInt(bare, 10);
  return null;
}

/**
 * Call ContactService/SynchronizeContactPerson to create a new contact record.
 *
 * This is only called when lookupContactPersonByName returns null, i.e. the
 * person does not yet exist in PNB at the given enterprise. For updates to
 * existing contacts, callUpdateContactPerson is used instead.
 *
 * Enterprise encoding:
 *   Must be sent as "recno:XXXX". The 360° adapter resolves the Enterprise field
 *   via a Contact lookup — a plain integer is mistaken for an ExternalID string
 *   and causes a LookupException. Plain text names are silently omitted to avoid
 *   the same error; "Employer is mandatory" will surface instead if enterprise
 *   is required on the destination 360° instance.
 *
 * @returns The Recno assigned by PNB to the new contact.
 * @throws  If SIF returns Successful: false or no Recno.
 */
async function callSynchronize(input: {
  externalId: string;
  firstName?: string;
  lastName?: string;
  enterprise?: string;
  title?: string;
}): Promise<number> {
  // Convert enterprise input to the "recno:XXXX" format 360° requires.
  let enterpriseForSif: string | undefined;
  if (input.enterprise) {
    const recno = parseEnterpriseRecno(input.enterprise);
    if (recno !== null) {
      enterpriseForSif = `recno:${recno}`;
    }
    // Plain name → omit rather than risk a LookupException on the 360° side.
  }

  const payload: SifSynchronizeContactPersonInput = {
    ExternalId: input.externalId,
    FirstName: input.firstName || undefined,
    LastName: input.lastName || undefined,
    Enterprise: enterpriseForSif,
    Title: input.title || undefined,
    Active: true,
  };
  const result = await sifRpcCall<
    SifSynchronizeContactPersonInput,
    SifSynchronizeContactPersonResult
  >(
    "ContactService",
    "SynchronizeContactPerson",
    payload,
    undefined,
    true // write operation — sifRpcCall wraps the payload in {"parameter": ...}
  );
  if (!result.Successful || result.Recno === undefined) {
    throw new Error(
      result.ErrorMessage ??
        result.ErrorDetails ??
        "SynchronizeContactPerson returned no Recno"
    );
  }
  return result.Recno;
}

/**
 * Call ContactService/UpdateContactPerson to patch an existing contact record.
 *
 * Requires the PNB Recno of the contact to update. Using Recno as the key
 * guarantees 360° modifies the correct record; SynchronizeContactPerson does
 * not reliably update existing records and may create duplicates instead.
 *
 * The enterprise must be in "recno:XXXX" format for the same reason as in
 * callSynchronize. Callers should derive it from the stored EnterpriseRecno
 * on the existing contact rather than from user input.
 *
 * @throws If SIF returns Successful: false.
 */
async function callUpdateContactPerson(input: {
  recno: number;
  firstName?: string;
  lastName?: string;
  externalId?: string;
  enterprise?: string;
  title?: string;
}): Promise<void> {
  let enterpriseForSif: string | undefined;
  if (input.enterprise) {
    const recno = parseEnterpriseRecno(input.enterprise);
    if (recno !== null) enterpriseForSif = `recno:${recno}`;
  }

  const payload: SifUpdateContactPersonInput = {
    Recno: input.recno,
    FirstName: input.firstName || undefined,
    LastName: input.lastName || undefined,
    ExternalId: input.externalId || undefined,
    Enterprise: enterpriseForSif,
    Title: input.title || undefined,
    Active: true,
  };
  console.info("[SIF] UpdateContactPerson", { recno: input.recno, title: input.title });
  const result = await sifRpcCall<SifUpdateContactPersonInput, SifUpdateContactPersonResult>(
    "ContactService",
    "UpdateContactPerson",
    payload,
    undefined,
    true // write operation
  );
  if (!result.Successful) {
    throw new Error(
      result.ErrorMessage ??
        result.ErrorDetails ??
        "UpdateContactPerson returned Successful: false"
    );
  }
}

/**
 * Map raw SIF case contact objects to the internal SifContact shape.
 * Falls back to a placeholder name when ContactName is absent.
 */
function mapCaseContacts(raw: SifCaseContact[]): SifContact[] {
  return raw.map((c) => ({
    recno: c.Recno,
    name: c.ContactName ?? `Contact ${c.Recno}`,
    role: c.Role,
    roleDescription: c.RoleDescription,
    email: c.Email,
    phone: c.Phone,
  }));
}
