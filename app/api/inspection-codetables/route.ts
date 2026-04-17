import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import {
  loadSifSettingsWithEnvFallback,
  toSifClientConfig,
} from "@/lib/sif/settings";
import { sifRpcCallWithConfig } from "@/lib/sif/client";

// Mapping fra intern type → PNB-kodetabellnavn
const CODETABLE_MAP: Record<string, string> = {
  "supervision-area": "eBy Supervision area",
  "measure-type": "eBy Measure type",
};

interface CodeTableRow {
  Recno?: number;
  Code?: string;
  Description?: string;
  SortOrder?: number;
  Active?: boolean;
}

interface GetCodeTableRowsResponse {
  Successful?: boolean;
  ErrorMessage?: string;
  Rows?: CodeTableRow[];
}

// ── GET /api/inspection-codetables?type=supervision-area|measure-type ─────────
// Tilgjengelig for alle innloggede brukere (ikke bare admin).
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (!type || !CODETABLE_MAP[type]) {
    return NextResponse.json(
      { error: "Query-param 'type' må være 'supervision-area' eller 'measure-type'" },
      { status: 400 }
    );
  }

  const tableName = CODETABLE_MAP[type];

  const settings = await loadSifSettingsWithEnvFallback();
  if (!settings.baseUrl) {
    // SIF ikke konfigurert — returner tom liste (graceful fallback)
    return NextResponse.json({ ok: true, items: [] });
  }

  const config = toSifClientConfig(settings);

  async function fetchCodeTable(wrap: boolean): Promise<GetCodeTableRowsResponse> {
    return sifRpcCallWithConfig<{ CodeTable: string }, GetCodeTableRowsResponse>(
      config,
      "SupportService",
      "GetCodeTableRows",
      { CodeTable: tableName },
      undefined,
      0,
      wrap
    );
  }

  function mapRows(result: GetCodeTableRowsResponse) {
    return (result.Rows ?? [])
      .filter((r) => r.Active !== false)
      .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
      .map((r) => ({
        code: r.Code ?? r.Description ?? "",
        description: r.Description ?? r.Code ?? "",
      }));
  }

  // Forsøk uten wrapping, deretter med
  let lastError = "Ukjent feil";

  try {
    const result = await fetchCodeTable(false);
    if (result.Successful !== false) {
      return NextResponse.json({ ok: true, items: mapRows(result) });
    }
    lastError = result.ErrorMessage ?? "Successful=false";
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    console.error("[codetables] unwrapped call failed:", lastError);
  }

  try {
    const result = await fetchCodeTable(true);
    if (result.Successful !== false) {
      return NextResponse.json({ ok: true, items: mapRows(result) });
    }
    lastError = result.ErrorMessage ?? "Successful=false (wrapped)";
    return NextResponse.json(
      { ok: false, items: [], error: lastError },
      { status: 502 }
    );
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    console.error("[codetables] wrapped call failed:", lastError);
    return NextResponse.json(
      { ok: false, items: [], error: lastError },
      { status: 502 }
    );
  }
}
