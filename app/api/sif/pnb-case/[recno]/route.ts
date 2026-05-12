import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import { sifRpcCall } from "@/lib/sif/client";
import { mapPnbCase } from "@/lib/sif/pnb-case-mapper";
import type { SifGetCasesQuery, SifGetCasesResult } from "@/lib/sif/types";

// ── GET /api/sif/pnb-case/[recno] ────────────────────────────────────────────
// Fetches a single PNB case by internal recno, with full detail.
export async function GET(
  req: NextRequest,
  { params }: { params: { recno: string } }
) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const recno = parseInt(params.recno, 10);
  if (isNaN(recno)) {
    return NextResponse.json({ ok: false, error: "Ugyldig recno" }, { status: 400 });
  }

  const settings = await loadSifSettingsWithEnvFallback();
  if (!settings.baseUrl) {
    return NextResponse.json({ ok: false, notConfigured: true });
  }

  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  try {
    const result = await sifRpcCall<SifGetCasesQuery, SifGetCasesResult>(
      "CaseService",
      "GetCases",
      {
        Recno: recno,
        MaxReturnedCases: 1,
        IncludeCaseContacts: true,
        IncludeCaseEstates: true,
        IncludeStages: true,
        IncludeMilestones: true,
        IncludeProgressPlan: true,
      }
    );

    if (!result.Successful) {
      return NextResponse.json(
        { ok: false, error: result.ErrorMessage ?? "Ukjent feil fra SIF" },
        { status: 502 }
      );
    }

    const raw = result.Cases?.[0];
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Sak ikke funnet" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, case: mapPnbCase(raw, baseUrl) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
