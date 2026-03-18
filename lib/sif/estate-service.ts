// ============================================================
// SIF EstateService - fetch estates (eiendommer) on a case
// Calls EstateService/GetEstates filtered by case number/recno.
// ============================================================

import { sifRpcCall } from "./client";
import type { SifEstate } from "@/types";

interface EstateQuery {
  CaseNumber?: string;
  CaseRecno?: number;
  MaxResults?: number;
}

interface RawEstateAddress {
  StreetAddress?: string;
  ZipCode?: string;
  ZipPlace?: string;
  County?: string;
  State?: string;
  Country?: string;
  Area?: string;
}

interface RawEstate {
  Recno: number;
  Address?: RawEstateAddress;
  EstateNumber?: number;    // gnr
  WorkNumber?: number;      // bnr
  SectionNumber?: number | null;  // snr
  LeaseHoldNumber?: number | null; // fnr
  Type?: string;
  Description?: string;
  Municipality?: string;
}

interface EstateListResult {
  Successful: boolean;
  Estates?: RawEstate[];
  ErrorMessage?: string;
}

/**
 * Fetch estates linked to a case via SIF EstateService/GetEstates.
 * Returns empty array if the case has no estates or if the call fails.
 */
export async function getCaseEstates(
  input: { caseRecno?: number; caseNumber?: string },
  correlationId?: string
): Promise<SifEstate[]> {
  const { caseRecno, caseNumber } = input;
  if (!caseRecno && !caseNumber) return [];

  const query: EstateQuery = { MaxResults: 50 };
  if (caseRecno) query.CaseRecno = caseRecno;
  else if (caseNumber) query.CaseNumber = caseNumber;

  try {
    const result = await sifRpcCall<EstateQuery, EstateListResult>(
      "EstateService",
      "GetEstates",
      query,
      correlationId
    );

    if (!result.Successful || !result.Estates) return [];

    return result.Estates.map((e) => ({
      recno: e.Recno,
      address: e.Address?.StreetAddress || undefined,
      gnr: e.EstateNumber != null ? String(e.EstateNumber) : undefined,
      bnr: e.WorkNumber != null ? String(e.WorkNumber) : undefined,
      snr: e.SectionNumber != null && e.SectionNumber !== 0 ? String(e.SectionNumber) : undefined,
      fnr: e.LeaseHoldNumber != null && e.LeaseHoldNumber !== 0 ? String(e.LeaseHoldNumber) : undefined,
      municipality: e.Municipality,
    }));
  } catch {
    return [];
  }
}
