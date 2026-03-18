import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sifRpcCall } from "@/lib/sif/client";

/**
 * Debug endpoint: returns raw (unmapped) SIF responses for estates and contacts.
 * Admin only. Used to inspect the actual field names returned by the SIF API.
 *
 * GET /api/sif/debug-raw?caseNumber=ULOV-25/00008&service=estates
 * GET /api/sif/debug-raw?caseNumber=ULOV-25/00008&service=contacts
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
      raw = await sifRpcCall("CaseService", "GetCaseContacts", {
        CaseNumber: caseNumber,
      });
    } else {
      return NextResponse.json({ error: "service must be 'estates' or 'contacts'" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, raw });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) });
  }
}
