import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  loadSifSettingsWithEnvFallback,
  toSifClientConfig,
} from "@/lib/sif/settings";
import { sifRpcCallWithConfig } from "@/lib/sif/client";

// Known code table names in Public 360° / Plan & Build
export const KNOWN_CODE_TABLES = [
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

  try {
    const result = await sifRpcCallWithConfig<
      { CodeTable: string },
      GetCodeTableRowsResponse
    >(config, "SupportService", "GetCodeTableRows", {
      CodeTable: tableName,
    });

    const rows = (result.Rows ?? []).map((r) => ({
      recno: r.Recno,
      code: r.Code,
      description: r.Description,
      sortOrder: r.SortOrder,
      active: r.Active ?? true,
    }));

    return NextResponse.json({ ok: true, table: tableName, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[SIF code-tables] Error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
