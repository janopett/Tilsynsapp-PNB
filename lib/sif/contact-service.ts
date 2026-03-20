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
  SifUpdateContactPersonInput,
  SifUpdateContactPersonResult,
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
 * Create or update a contact person in PNB.
 *
 * Logic:
 * 1. GetContactPersons by FirstName + LastName, filtered by enterprise recno.
 *    Contacts in PNB may predate our system and have no ExternalId — name +
 *    enterprise is the only reliable identifier.
 * 2. Match found → UpdateContactPerson (patches the existing record by Recno).
 * 3. No match   → SynchronizeContactPerson (creates a new contact).
 *
 * Enterprise must be "recno:XXXX" or a bare integer so the recno is known.
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

  const existing = await lookupContactPersonByName(input.firstName, input.lastName, enterpriseRecno);

  if (existing) {
    console.info("[SIF] Contact found — updating via UpdateContactPerson", {
      recno: existing.Recno,
      name: existing.Name,
      storedTitle: existing.Title,
      inputTitle: input.title,
      enterpriseRecno: existing.EnterpriseRecno,
    });
    await callUpdateContactPerson({
      recno: existing.Recno,
      firstName: existing.FirstName ?? input.firstName,
      lastName: existing.LastName ?? input.lastName,
      externalId: input.externalId,
      enterprise:
        existing.EnterpriseRecno !== undefined
          ? `recno:${existing.EnterpriseRecno}`
          : input.enterprise,
      title: input.title,
    });
    return existing.Recno;
  }

  // Not found by name + enterprise: create new contact.
  console.info("[SIF] Contact not found — creating via SynchronizeContactPerson", {
    firstName: input.firstName,
    lastName: input.lastName,
    enterprise: input.enterprise,
  });
  return callSynchronize(input);
}

/**
 * Search GetContactPersons by full name, filtered by enterprise recno.
 * Returns the first match when enterprise recno matches.
 * Returns the only match when name is unambiguous and no enterprise filter is needed.
 * Returns null if no match found.
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
    // Accept results regardless of Successful flag — some SIF instances return false for empty.
    if (!result.ContactPersons?.length) return null;

    const fullName = nameQuery.toLowerCase();
    const nameMatches = result.ContactPersons.filter((c) => {
      const stored = (c.Name ?? [c.FirstName, c.LastName].filter(Boolean).join(" ")).toLowerCase();
      return stored === fullName;
    });

    if (!nameMatches.length) return null;

    // If enterprise recno is known, require it to match — avoids updating a
    // contact at a different employer who happens to share the same name.
    if (enterpriseRecno !== undefined) {
      const withEnterprise = nameMatches.filter((c) => c.EnterpriseRecno === enterpriseRecno);
      if (withEnterprise.length >= 1) return withEnterprise[0];
      // Name matches exist but none at this enterprise → treat as not found.
      console.info("[SIF] Name matched but no contact at the given enterprise", {
        nameQuery,
        enterpriseRecno,
        candidates: nameMatches.map((c) => ({ recno: c.Recno, enterpriseRecno: c.EnterpriseRecno })),
      });
      return null;
    }

    // No enterprise filter: return only when the name is unambiguous.
    if (nameMatches.length === 1) return nameMatches[0];

    console.info("[SIF] Ambiguous name match — cannot determine which contact to update", {
      nameQuery,
      count: nameMatches.length,
    });
    return null;
  } catch (err) {
    console.warn("[SIF] GetContactPersons(Name) lookup failed (non-fatal)", {
      nameQuery,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
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

/** Raw SynchronizeContactPerson call — used only when no existing contact is found. */
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

/** Update an existing contact person by Recno via ContactService/UpdateContactPersons. */
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
      result.ErrorMessage ?? result.ErrorDetails ?? "UpdateContactPerson returnerte Successful=false"
    );
  }
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
