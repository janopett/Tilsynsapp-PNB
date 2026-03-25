import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { writeAuditLog } from "@/lib/audit-log";
import { createServiceClient } from "@/lib/supabase/server";
import { loadSifSettings, sanitizeForClient, invalidateSifSettingsCache } from "@/lib/sif/settings";
import type { SifAuthMode } from "@/lib/sif/auth";

// ── GET /api/sif/settings ─────────────────────────────────────────────────────
// Returns current settings (secrets are masked).
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const settings = await loadSifSettings();
  if (!settings) {
    return NextResponse.json({ configured: false, settings: null });
  }

  return NextResponse.json({ configured: true, settings: sanitizeForClient(settings) });
}

// ── PUT /api/sif/settings ─────────────────────────────────────────────────────
// Upserts the singleton settings row.
// Sensitive fields (authkey, oauthClientSecret) are only updated when the caller
// sends a non-masked value (i.e. not "••••••••").
export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Load existing row so we can preserve secrets when masked placeholder is sent
  const existing = await loadSifSettings();

  const MASK = "••••••••";

  const authkey =
    typeof body.authkey === "string" && body.authkey !== MASK
      ? body.authkey
      : (existing?.authkey ?? "");

  const oauthClientSecret =
    typeof body.oauthClientSecret === "string" &&
    body.oauthClientSecret !== MASK
      ? body.oauthClientSecret
      : (existing?.oauthClientSecret ?? "");

  const row = {
    base_url: String(body.baseUrl ?? ""),
    rpc_path:
      String(body.rpcPath ?? "") ||
      "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
    auth_mode: (["authkey", "combined_daemon"].includes(
      String(body.authMode)
    )
      ? body.authMode
      : "authkey") as SifAuthMode,
    authkey,
    timeout_ms: Number(body.timeoutMs ?? 30000),
    oauth_client_id: String(body.oauthClientId ?? ""),
    oauth_client_secret: oauthClientSecret,
    oauth_token_url: String(body.oauthTokenUrl ?? ""),
    oauth_scope: String(body.oauthScope ?? ""),
    doc_archive: String(body.docArchive ?? "recno:2"),
    doc_category: String(body.docCategory ?? "recno:111"),
    doc_status: String(body.docStatus ?? "J"),
    doc_title_template:
      String(body.docTitleTemplate ?? "") ||
      "Tilsynsrapport - {{propertyAddress}} - {{date}}",
    doc_main_file_relation_type: String(body.docMainFileRelationType ?? "H"),
    doc_attachment_relation_type: String(
      body.docAttachmentRelationType ?? "V"
    ),
    role_municipality_sender: String(body.roleMunicipalitySender ?? "AV"),
    role_applicant_recipient: String(body.roleApplicantRecipient ?? "EM"),
    role_copy_recipient: String(body.roleCopyRecipient ?? "KM"),
    responsible_person_recno: Number(body.responsiblePersonRecno ?? 0),
    doc_access_code: String(body.docAccessCode ?? ""),
    auto_dispatch: Boolean(body.autoDispatch ?? false),
  };

  // Singleton: insert first row or update the existing one
  const { data: existingRow } = await supabase
    .from("sif_settings")
    .select("id")
    .maybeSingle();

  let dbError;
  if (existingRow) {
    ({ error: dbError } = await supabase
      .from("sif_settings")
      .update(row)
      .eq("id", existingRow.id));
  } else {
    ({ error: dbError } = await supabase.from("sif_settings").insert(row));
  }

  if (dbError) {
    console.error("[SIF settings] Save failed:", dbError.message);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }

  invalidateSifSettingsCache();

  await writeAuditLog({
    adminId: auth.user.id,
    action: "sif_settings.update",
    targetType: "sif_settings",
    // Log non-sensitive fields only — never log authkey or client_secret
    metadata: {
      baseUrl: row.base_url,
      authMode: row.auth_mode,
      docArchive: row.doc_archive,
      docCategory: row.doc_category,
      autoDispatch: row.auto_dispatch,
    },
  });

  return NextResponse.json({ ok: true });
}
