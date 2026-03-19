import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { findCaseInSif } from "@/lib/sif/case-service";
import { getEstateByMatrikkel } from "@/lib/sif/estate-service";
import type { SifCaseEstate } from "@/lib/sif/types";
import type { SifEstate } from "@/types";

interface RawArchiveCode {
  ArchiveCode?: string;
  ArchiveType?: string;
}

/**
 * Parse SIF ArchiveCodes of type "Gnr/bnr" into estate records.
 * Format: "kommunenr/gnr/bnr/fnr/snr"
 * Example: "4601/168/200/0/1" → gnr=168, bnr=200, fnr=0, snr=1
 */
function parseArchiveCodes(archiveCodes: RawArchiveCode[]): Array<{ gnr: number; bnr: number; snr: number | null; fnr: number | null }> {
  return archiveCodes
    .filter((ac) => ac.ArchiveType === "Gnr/bnr" && ac.ArchiveCode)
    .map((ac) => {
      const parts = (ac.ArchiveCode ?? "").split("/");
      const gnr = parseInt(parts[1] ?? "", 10);
      const bnr = parseInt(parts[2] ?? "", 10);
      const fnr = parseInt(parts[3] ?? "0", 10);
      const snr = parseInt(parts[4] ?? "0", 10);
      return isNaN(gnr) || isNaN(bnr)
        ? null
        : { gnr, bnr, fnr: fnr || null, snr: snr || null };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

function caseEstateToSifEstate(e: SifCaseEstate): SifEstate {
  return {
    recno: e.Recno,
    address: e.Address?.StreetAddress || undefined,
    gnr: e.EstateNumber != null ? String(e.EstateNumber) : undefined,
    bnr: e.WorkNumber != null ? String(e.WorkNumber) : undefined,
    snr: e.SectionNumber != null && e.SectionNumber !== 0 ? String(e.SectionNumber) : undefined,
    fnr: e.LeaseHoldNumber != null && e.LeaseHoldNumber !== 0 ? String(e.LeaseHoldNumber) : undefined,
    municipality: e.Municipality,
  };
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const caseNumber = searchParams.get("caseNumber") ?? undefined;
  const caseRecnoStr = searchParams.get("caseRecno");
  const caseRecno = caseRecnoStr ? parseInt(caseRecnoStr, 10) : undefined;

  if (!caseNumber && !caseRecno) {
    return NextResponse.json(
      { error: "caseNumber or caseRecno is required" },
      { status: 400 }
    );
  }

  try {
    const sifCase = await findCaseInSif({ caseNumber });
    const raw = sifCase.raw as {
      CaseEstates?: SifCaseEstate[];
      ArchiveCodes?: RawArchiveCode[];
    } | undefined;

    // Strategy 1: CaseEstates from GetCases (IncludeCaseEstates: true)
    if (raw?.CaseEstates?.length) {
      const estates = raw.CaseEstates.map(caseEstateToSifEstate);
      return NextResponse.json({ ok: true, estates });
    }

    // Strategy 2: Parse ArchiveCodes + enrich with EstateService/GetEstates
    const archiveCodes = raw?.ArchiveCodes ?? [];
    const parsed = parseArchiveCodes(archiveCodes);

    if (parsed.length === 0) {
      return NextResponse.json({ ok: true, estates: [] });
    }

    const estateResults = await Promise.allSettled(
      parsed.map((m) => getEstateByMatrikkel(m.gnr, m.bnr))
    );

    const estates: SifEstate[] = parsed.map((m, i) => {
      const result = estateResults[i];
      const enriched =
        result.status === "fulfilled" && result.value ? result.value : null;

      return {
        recno: enriched?.Recno ?? -(m.gnr * 100000 + m.bnr),
        address: enriched?.Address?.StreetAddress || undefined,
        gnr: String(m.gnr),
        bnr: String(m.bnr),
        snr: m.snr ? String(m.snr) : undefined,
        fnr: m.fnr ? String(m.fnr) : undefined,
        municipality: enriched?.Municipality,
      };
    });

    return NextResponse.json({ ok: true, estates });
  } catch (err) {
    console.error("[case-estates] Error", err);
    return NextResponse.json({ ok: false, estates: [], error: String(err) });
  }
}
