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
  ErrorDetails?: string;
  TotalCount?: number;
  Rows?: CodeTableRow[];         // some SIF versions
  CodeTableRows?: CodeTableRow[]; // other SIF versions
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

  function mapRows(result: GetCodeTableRowsResponse) {
    return (result.Rows ?? result.CodeTableRows ?? [])
      .filter((r) => r.Active !== false)
      .sort((a, b) => (a.SortOrder ?? 0) - (b.SortOrder ?? 0))
      .map((r) => ({
        code: r.Code ?? r.Description ?? "",
        description: r.Description ?? r.Code ?? "",
      }));
  }

  const payload = { CodeTableName: tableName, IncludeExpiredValues: false };
  type Payload = typeof payload;

  async function fetchWith(wrap: boolean): Promise<GetCodeTableRowsResponse> {
    return sifRpcCallWithConfig<Payload, GetCodeTableRowsResponse>(
      config, "SupportService", "GetCodeTableRows", payload, undefined, 0, wrap
    );
  }

  let firstError: string | null = null;

  // Attempt 1: no wrapping (matches all other working SIF calls)
  try {
    const result = await fetchWith(false);
    if (result.Successful !== false) {
      return NextResponse.json({ ok: true, items: mapRows(result) });
    }
    firstError = result.ErrorMessage ?? result.ErrorDetails ?? "Successful=false";
    console.info("[codetables] Attempt 1 (unwrapped) Successful=false, retrying wrapped", { type, firstError });
  } catch (e) {
    firstError = e instanceof Error ? e.message : String(e);
    console.info("[codetables] Attempt 1 (unwrapped) threw, retrying wrapped", { type, firstError });
  }

  // Attempt 2: with { parameter: {...} } wrapping
  try {
    const result = await fetchWith(true);
    if (result.Successful !== false) {
      return NextResponse.json({ ok: true, items: mapRows(result) });
    }
    const msg = result.ErrorMessage ?? result.ErrorDetails ?? firstError ?? "Successful=false";
    console.error("[codetables] Both attempts failed", { type, msg });
    return NextResponse.json({ ok: false, items: [], error: msg }, { status: 502 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[codetables] Both attempts threw", { type, firstError, secondError: msg });
    return NextResponse.json({ ok: false, items: [], error: msg }, { status: 502 });
  }
}
