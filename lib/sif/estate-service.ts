// ============================================================
// SIF EstateService - fetch estates (eiendommer)
// ============================================================

import type { SifEstate } from "@/types";
import { sifRpcCall } from "./client";

interface EstateQuery {
  // NOTE: CaseNumber/CaseRecno are not in the official Swagger for GetEstates,
  // but some SIF installations support them as undocumented filters.
  CaseNumber?: string;
  CaseRecno?: number;
  EstateNumber?: number;
  WorkNumber?: number;
  SectionNumber?: number;
  LeaseHoldNumber?: number;
  BuildingNumber?: number;
  /** Swagger field name: MaxRows (NOT MaxResults) */
  MaxRows?: number;
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

export interface RawEstate {
  Recno: number;
  Address?: RawEstateAddress;
  EstateNumber?: number; // gnr
  WorkNumber?: number; // bnr
  SectionNumber?: number | null; // snr
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

function rawToSifEstate(e: RawEstate): SifEstate {
  return {
    recno: e.Recno,
    address: e.Address?.StreetAddress || undefined,
    zipCode: e.Address?.ZipCode || undefined,
    zipPlace: e.Address?.ZipPlace || undefined,
    gnr: e.EstateNumber != null ? String(e.EstateNumber) : undefined,
    bnr: e.WorkNumber != null ? String(e.WorkNumber) : undefined,
    snr: e.SectionNumber != null && e.SectionNumber !== 0 ? String(e.SectionNumber) : undefined,
    fnr:
      e.LeaseHoldNumber != null && e.LeaseHoldNumber !== 0 ? String(e.LeaseHoldNumber) : undefined,
    municipality: e.Municipality,
  };
}

/**
 * Fetch a single estate by its matrikkel numbers (gnr/bnr).
 * Used to enrich ArchiveCode-parsed estate data with address.
 */
export async function getEstateByMatrikkel(
  gnr: number,
  bnr: number,
  correlationId?: string
): Promise<RawEstate | null> {
  try {
    const result = await sifRpcCall<EstateQuery, EstateListResult>(
      "EstateService",
      "GetEstates",
      { EstateNumber: gnr, WorkNumber: bnr, MaxRows: 10 },
      correlationId
    );
    if (!result.Successful || !result.Estates?.length) return null;
    return result.Estates[0];
  } catch {
    return null;
  }
}

/**
 * Fetch estates linked to a case via SIF EstateService/GetEstates.
 * NOTE: CaseNumber/CaseRecno filtering is unreliable in SIF — prefer
 * parseArchiveCodeEstates() for case-linked estate lookup.
 * Returns empty array if the case has no estates or if the call fails.
 */
export async function getCaseEstates(
  input: { caseRecno?: number; caseNumber?: string },
  correlationId?: string
): Promise<SifEstate[]> {
  const { caseRecno, caseNumber } = input;
  if (!caseRecno && !caseNumber) return [];

  const query: EstateQuery = { MaxRows: 50 };
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
    return result.Estates.map(rawToSifEstate);
  } catch {
    return [];
  }
}
