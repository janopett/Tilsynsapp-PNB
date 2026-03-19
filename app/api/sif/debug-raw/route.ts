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
  const service = searchParams.get("service"); // "estates" | "contacts"

  if (!caseNumber || !service) {
    return NextResponse.json({ error: "caseNumber and service are required" }, { status: 400 });
  }

  try {
    let raw: unknown;
    if (service === "estates") {
      raw = await sifRpcCall("EstateService", "GetEstates", {
        CaseNumber: caseNumber,
        MaxResults: 10,
      });
    } else if (service === "contacts") {
      // Try with CaseNumber first; also try CaseRecno if we can look it up
      let caseRecno: number | undefined;
      try {
        const sifCase = await findCaseInSif({ caseNumber });
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
      // Raw GetCases — shows all fields including ResponsibleEnterprise, etc.
      raw = await sifRpcCall("CaseService", "GetCases", {
        CaseNumber: caseNumber,
        MaxResults: 1,
      });
    } else {
      return NextResponse.json({ error: "service must be 'estates', 'contacts', or 'cases'" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, raw });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
