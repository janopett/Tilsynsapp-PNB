import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sifRpcCall } from "@/lib/sif/client";
import { findCaseInSif } from "@/lib/sif/case-service";

/**
 * Debug endpoint: returns raw (unmapped) SIF responses for estates and contacts.
 * Admin only. Used to inspect the actual field names returned by the SIF API.
 *
 * GET /api/sif/debug-raw?caseNumber=ULOV-25/00008&service=estates
 * GET /api/sif/debug-raw?caseNumber=ULOV-25/00008&service=contacts
 * GET /api/sif/debug-raw?caseNumber=ULOV-25/00008&service=cases
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const caseNumber = searchParams.get("caseNumber");
  const service = searchParams.get("service");
  const codetable = searchParams.get("codetable");

  if (!service) {
    return NextResponse.json({ error: "service is required" }, { status: 400 });
  }

  // codetable service doesn't need caseNumber
  if (service !== "codetable" && !caseNumber) {
    return NextResponse.json({ error: "caseNumber is required" }, { status: 400 });
  }

  try {
    let raw: unknown;
    if (service === "estates") {
      raw = await sifRpcCall("EstateService", "GetEstates", {
        CaseNumber: caseNumber,
        MaxRows: 10,
      });
    } else if (service === "contacts") {
      // Try with CaseNumber first; also try CaseRecno if we can look it up
      let caseRecno: number | undefined;
      try {
        const sifCase = await findCaseInSif({ caseNumber: caseNumber ?? undefined });
        caseRecno = sifCase.recno;
      } catch { /* ignore */ }

      // Try CaseRecno first, then CaseNumber, collect both results for comparison
      const results: Record<string, unknown> = {};
      if (caseRecno) {
        try {
          results.byRecno = await sifRpcCall("CaseService", "GetCaseContacts", { CaseRecno: caseRecno });
        } catch (e) {
          results.byRecnoError = String(e);
        }
      }
      try {
        results.byNumber = await sifRpcCall("CaseService", "GetCaseContacts", { CaseNumber: caseNumber });
      } catch (e) {
        results.byNumberError = String(e);
      }
      raw = results;
    } else if (service === "cases") {
      // Raw GetCases with all include-flags — shows Contacts, ReferringCases, and Stages
      raw = await sifRpcCall("CaseService", "GetCases", {
        CaseNumber: caseNumber,
        MaxReturnedCases: 1,
        IncludeReferringCases: true,
        IncludeCaseContacts: true,
        IncludeStages: true,
        IncludeDocuments: true,
      });
    } else if (service === "documents") {
      raw = await sifRpcCall("DocumentService", "GetDocuments", {
        CaseNumber: caseNumber,
        MaxReturnedDocuments: 10,
        SortCriterion: "RecnoDescending",
      });
    } else if (service === "files") {
      raw = await sifRpcCall("DocumentService", "GetDocuments", {
        CaseNumber: caseNumber,
        MaxReturnedDocuments: 25,
        SortCriterion: "RecnoDescending",
        IncludeFiles: true,
      });
    } else if (service === "codetable") {
      if (!codetable) {
        return NextResponse.json({ error: "codetable param is required" }, { status: 400 });
      }
      const { loadSifSettingsWithEnvFallback, toSifClientConfig } = await import("@/lib/sif/settings");
      const { sifRpcCallWithConfig } = await import("@/lib/sif/client");
      const config = toSifClientConfig(await loadSifSettingsWithEnvFallback());
      raw = await sifRpcCallWithConfig(
        config, "SupportService", "GetCodeTableRows",
        { CodeTableName: codetable, IncludeExpiredValues: false },
        undefined, 0, true
      );
    } else {
      return NextResponse.json({ error: "unknown service" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, raw });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
