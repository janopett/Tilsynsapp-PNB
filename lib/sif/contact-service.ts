// ============================================================
// SIF ContactService - fetch contacts on a case
// ============================================================

import { sifRpcCall } from "./client";
import type {
  SifGetCaseContactsQuery,
  SifGetCaseContactsResult,
  SifCaseContact,
} from "./types";
import type { SifContact } from "@/types";

/**
 * Fetch all contacts associated with a case in SIF.
 * Calls CaseService/GetCaseContacts.
 * Returns empty array if the case has no contacts or the call fails.
 */
export async function getCaseContacts(
  input: { caseRecno?: number; caseNumber?: string },
  correlationId?: string
): Promise<SifContact[]> {
  const { caseRecno, caseNumber } = input;

  if (!caseRecno && !caseNumber) {
    return [];
  }

  const query: SifGetCaseContactsQuery = {};
  if (caseRecno) query.CaseRecno = caseRecno;
  else if (caseNumber) query.CaseNumber = caseNumber;

  console.info("[SIF] CaseService/GetCaseContacts", { correlationId, query });

  const result = await sifRpcCall<SifGetCaseContactsQuery, SifGetCaseContactsResult>(
    "CaseService",
    "GetCaseContacts",
    query,
    correlationId
  );

  if (!result.Successful) {
    console.warn("[SIF] GetCaseContacts failed:", result.ErrorMessage);
    return [];
  }

  return (result.Contacts ?? []).map(mapToSifContact);
}

function mapToSifContact(raw: SifCaseContact): SifContact {
  return {
    recno: raw.Recno,
    name: raw.Name ?? `Kontakt ${raw.Recno}`,
    role: raw.Role,
    roleDescription: raw.RoleDescription,
    email: raw.Email,
    phone: raw.Phone,
  };
}
