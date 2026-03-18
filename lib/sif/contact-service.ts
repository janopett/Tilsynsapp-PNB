// ============================================================
// SIF ContactService - fetch contacts on a case
// Calls GetContactPersons, GetPrivatePersons and GetEnterprises
// filtered by case number, then merges the results.
// ============================================================

import { sifRpcCall } from "./client";
import type { SifContact } from "@/types";

// ── Shared query shape (all three methods accept the same filter) ──────────────

interface ContactQuery {
  CaseNumber?: string;
  CaseRecno?: number;
  MaxResults?: number;
}

// ── Raw response shapes ───────────────────────────────────────────────────────

interface RawContactPerson {
  Recno: number;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Email?: string;
  Phone?: string;
  Role?: string;
  RoleDescription?: string;
}

interface RawPrivatePerson {
  Recno: number;
  FirstName?: string;
  LastName?: string;
  FullName?: string;
  Email?: string;
  Phone?: string;
  Role?: string;
  RoleDescription?: string;
}

interface RawEnterprise {
  Recno: number;
  Name?: string;
  Email?: string;
  Phone?: string;
  Role?: string;
  RoleDescription?: string;
}

interface ContactListResult<T> {
  Successful: boolean;
  Contacts?: T[];
  ContactPersons?: T[];
  PrivatePersons?: T[];
  Enterprises?: T[];
  ErrorMessage?: string;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Fetch all contacts on a case by calling all three ContactService methods
 * (GetContactPersons, GetPrivatePersons, GetEnterprises) and merging results.
 * Returns empty array if the case has no contacts or calls fail.
 */
export async function getCaseContacts(
  input: { caseRecno?: number; caseNumber?: string },
  correlationId?: string
): Promise<SifContact[]> {
  const { caseRecno, caseNumber } = input;
  if (!caseRecno && !caseNumber) return [];

  const query: ContactQuery = { MaxResults: 50 };
  if (caseRecno) query.CaseRecno = caseRecno;
  else if (caseNumber) query.CaseNumber = caseNumber;

  const [persons, privatePersons, enterprises] = await Promise.allSettled([
    sifRpcCall<ContactQuery, ContactListResult<RawContactPerson>>(
      "ContactService", "GetContactPersons", query, correlationId
    ),
    sifRpcCall<ContactQuery, ContactListResult<RawPrivatePerson>>(
      "ContactService", "GetPrivatePersons", query, correlationId
    ),
    sifRpcCall<ContactQuery, ContactListResult<RawEnterprise>>(
      "ContactService", "GetEnterprises", query, correlationId
    ),
  ]);

  const contacts: SifContact[] = [];

  if (persons.status === "fulfilled" && persons.value.Successful) {
    const rows = persons.value.Contacts ?? persons.value.ContactPersons ?? [];
    rows.forEach((p) =>
      contacts.push({
        recno: p.Recno,
        name: (p.FullName ?? `${p.FirstName ?? ""} ${p.LastName ?? ""}`.trim()) || `Person ${p.Recno}`,
        role: p.Role,
        roleDescription: p.RoleDescription,
        email: p.Email,
        phone: p.Phone,
        type: "contactPerson",
      })
    );
  }

  if (privatePersons.status === "fulfilled" && privatePersons.value.Successful) {
    const rows = privatePersons.value.Contacts ?? privatePersons.value.PrivatePersons ?? [];
    rows.forEach((p) =>
      contacts.push({
        recno: p.Recno,
        name: (p.FullName ?? `${p.FirstName ?? ""} ${p.LastName ?? ""}`.trim()) || `Privatperson ${p.Recno}`,
        role: p.Role,
        roleDescription: p.RoleDescription,
        email: p.Email,
        phone: p.Phone,
        type: "privatePerson",
      })
    );
  }

  if (enterprises.status === "fulfilled" && enterprises.value.Successful) {
    const rows = enterprises.value.Contacts ?? enterprises.value.Enterprises ?? [];
    rows.forEach((e) =>
      contacts.push({
        recno: e.Recno,
        name: e.Name ?? `Virksomhet ${e.Recno}`,
        role: e.Role,
        roleDescription: e.RoleDescription,
        email: e.Email,
        phone: e.Phone,
        type: "enterprise",
      })
    );
  }

  return contacts;
}
