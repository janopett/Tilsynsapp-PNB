import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sifRpcCallWithConfig } from "@/lib/sif/client";
import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "@/lib/sif/settings";

// Mapping fra intern type → PNB-kodetabellnavn
const CODETABLE_MAP: Record<string, string> = {
  "supervision-area": "code table: eBy Supervision area",
  "measure-type": "code table: eBy Measure type",
};

interface CodeTableRow {
  Recno?: number;
  Code?: string;
  Description?: string;
  Language?: string;
  IsExpired?: boolean;
}

interface GetCodeTableRowsResponse {
  Successful?: boolean;
  ErrorMessage?: string;
  ErrorDetails?: string;
  TotalCount?: number;
  Rows?: CodeTableRow[]; // some SIF versions
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
    return (result.CodeTableRows ?? result.Rows ?? [])
      .filter((r) => r.IsExpired !== true)
      .map((r) => ({
        // Use Description as the stored key so values are human-readable
        // and consistent with migration seed data and filter-engine comparisons.
        code: r.Description ?? r.Code ?? "",
        description: r.Description ?? r.Code ?? "",
      }));
  }

  // Swagger confirms { parameter: {...} } wrapping is always required for GetCodeTableRows
  try {
    const result = await sifRpcCallWithConfig<
      { CodeTableName: string; IncludeExpiredValues: boolean },
      GetCodeTableRowsResponse
    >(
      config,
      "SupportService",
      "GetCodeTableRows",
      { CodeTableName: tableName, IncludeExpiredValues: false },
      undefined,
      0,
      true
    );

    if (result.Successful === false) {
      const msg = result.ErrorMessage ?? result.ErrorDetails ?? "Successful=false";
      console.error("[codetables] GetCodeTableRows Successful=false", { type, tableName, msg });
      return NextResponse.json({ ok: false, items: [], error: msg }, { status: 502 });
    }
    return NextResponse.json({ ok: true, items: mapRows(result) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[codetables] GetCodeTableRows failed", { type, tableName, msg });
    return NextResponse.json({ ok: false, items: [], error: msg }, { status: 502 });
  }
}
