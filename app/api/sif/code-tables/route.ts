import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sifRpcCallWithConfig } from "@/lib/sif/client";
import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "@/lib/sif/settings";

// Known code table names in Public 360° / Plan & Build
const KNOWN_CODE_TABLES = [
  "Document archive",
  "Document category",
  "Document status",
  "Contact role",
  "Case status",
] as const;

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
  Rows?: CodeTableRow[];
  CodeTableRows?: CodeTableRow[];
  TotalCount?: number;
}

// ── GET /api/sif/code-tables?table=Document+archive ──────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const tableName = searchParams.get("table");
  if (!tableName) {
    return NextResponse.json({ error: "Query param 'table' is required" }, { status: 400 });
  }

  const settings = await loadSifSettingsWithEnvFallback();
  if (!settings.baseUrl) {
    return NextResponse.json({ error: "SIF base URL is not configured" }, { status: 503 });
  }

  const config = toSifClientConfig(settings);

  function mapRows(result: GetCodeTableRowsResponse) {
    return (result.CodeTableRows ?? result.Rows ?? [])
      .filter((r) => r.IsExpired !== true)
      .map((r) => ({
        recno: r.Recno,
        code: r.Code,
        description: r.Description,
        language: r.Language,
      }));
  }

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
      console.error("[SIF code-tables] Successful=false", { tableName, msg });
      return NextResponse.json({ ok: false, error: msg }, { status: 502 });
    }
    return NextResponse.json({ ok: true, table: tableName, rows: mapRows(result) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SIF code-tables] threw", { tableName, msg });
    return NextResponse.json({ ok: false, error: msg }, { status: 502 });
  }
}
