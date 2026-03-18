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

interface RawEstate {
  Recno: number;
  Address?: string;
  GNr?: string;
  BNr?: string;
  FNr?: string;
  SNr?: string;
  Municipality?: string;
  // Some SIF versions use different casing
  Gnr?: string;
  Bnr?: string;
  Fnr?: string;
  Snr?: string;
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
      address: e.Address,
      gnr: e.GNr ?? e.Gnr,
      bnr: e.BNr ?? e.Bnr,
      fnr: e.FNr ?? e.Fnr,
      snr: e.SNr ?? e.Snr,
      municipality: e.Municipality,
    }));
  } catch {
    return [];
  }
}
