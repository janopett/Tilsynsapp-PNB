import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  loadSifSettingsWithEnvFallback,
  toSifClientConfig,
} from "@/lib/sif/settings";
import { sifRpcCallWithConfig } from "@/lib/sif/client";

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
  SortOrder?: number;
  Active?: boolean;
}

interface GetCodeTableRowsResponse {
  Successful?: boolean;
  ErrorMessage?: string;
  ErrorDetails?: string;
  Rows?: CodeTableRow[];
  TotalCount?: number;
}

// ── GET /api/sif/code-tables?table=Document+archive ──────────────────────────
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const tableName = searchParams.get("table");
  if (!tableName) {
    return NextResponse.json(
      { error: "Query param 'table' is required" },
      { status: 400 }
    );
  }

  const settings = await loadSifSettingsWithEnvFallback();
  if (!settings.baseUrl) {
    return NextResponse.json(
      { error: "SIF base URL is not configured" },
      { status: 503 }
    );
  }

  const config = toSifClientConfig(settings);

  // Try without wrapping first (matches all other working SIF calls);
  // fall back to { parameter: {...} } wrapping if the result indicates failure.
  const tableNameStr: string = tableName;
  async function fetchCodeTable(wrap: boolean): Promise<GetCodeTableRowsResponse> {
    return sifRpcCallWithConfig<{ CodeTableName: string; IncludeExpiredValues: boolean }, GetCodeTableRowsResponse>(
      config, "SupportService", "GetCodeTableRows",
      { CodeTableName: tableNameStr, IncludeExpiredValues: false },
      undefined, 0, wrap
    );
  }

  function mapRows(result: GetCodeTableRowsResponse) {
    return (result.Rows ?? []).map((r) => ({
      recno: r.Recno,
      code: r.Code,
      description: r.Description,
      sortOrder: r.SortOrder,
      active: r.Active ?? true,
    }));
  }

  let firstError: string | null = null;

  // Attempt 1: no wrapping
  try {
    const result = await fetchCodeTable(false);
    if (result.Successful !== false) {
      return NextResponse.json({ ok: true, table: tableName, rows: mapRows(result) });
    }
    firstError = result.ErrorMessage ?? result.ErrorDetails ?? "SIF returnerte Successful:false";
    console.info("[SIF code-tables] Successful:false without wrapping, retrying wrapped", { tableName, firstError });
  } catch (err) {
    firstError = err instanceof Error ? err.message : String(err);
    console.info("[SIF code-tables] Failed without wrapping, retrying wrapped", { tableName, firstError });
  }

  // Attempt 2: with { parameter: {...} } wrapping
  try {
    const result = await fetchCodeTable(true);
    if (result.Successful !== false) {
      return NextResponse.json({ ok: true, table: tableName, rows: mapRows(result) });
    }
    const msg = result.ErrorMessage ?? result.ErrorDetails ?? firstError ?? "Ukjent SIF-feil";
    console.error("[SIF code-tables] Both attempts failed", { tableName, msg });
    return NextResponse.json({ ok: false, error: "Kunne ikke hente kodeverdier fra SIF." }, { status: 502 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SIF code-tables] Both attempts threw", { tableName, firstError, secondError: msg });
    return NextResponse.json({ ok: false, error: "Kunne ikke hente kodeverdier fra SIF." }, { status: 502 });
  }
}
