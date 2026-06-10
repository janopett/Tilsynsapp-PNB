// ============================================================
// SIF Settings – load from Supabase DB, fall back to env vars.
// Server-side only (uses service role client).
// ============================================================

import { sifMapping } from "@/config/sif-mapping";
import { createServiceClient } from "@/lib/supabase/server";
import type { SifAuthConfig, SifAuthMode } from "./auth";
import type { SifClientConfig } from "./client";

export interface SifSettings {
  // Connection
  baseUrl: string;
  rpcPath: string;
  authMode: SifAuthMode;
  authkey: string;
  timeoutMs: number;
  // OAuth (combined_daemon)
  oauthClientId: string;
  oauthClientSecret: string;
  oauthTokenUrl: string;
  oauthScope: string;
  // Document mapping
  docArchive: string;
  docCategory: string;
  docStatus: string;
  docTitleTemplate: string;
  docMainFileRelationType: string;
  docAttachmentRelationType: string;
  // Contact roles
  roleMunicipalitySender: string;
  roleApplicantRecipient: string;
  roleCopyRecipient: string;
  // Defaults
  responsiblePersonRecno: number;
  // Access code (tilgangskode). Empty = use 360° default (no explicit code).
  docAccessCode: string;
  // Automatically dispatch document to recipients after archiving.
  autoDispatch: boolean;
}

/** Row shape returned by Supabase for sif_settings */
interface SifSettingsRow {
  id: string;
  base_url: string;
  rpc_path: string;
  auth_mode: string;
  authkey: string;
  timeout_ms: number;
  oauth_client_id: string;
  oauth_client_secret: string;
  oauth_token_url: string;
  oauth_scope: string;
  doc_archive: string;
  doc_category: string;
  doc_status: string;
  doc_title_template: string;
  doc_main_file_relation_type: string;
  doc_attachment_relation_type: string;
  role_municipality_sender: string;
  role_applicant_recipient: string;
  role_copy_recipient: string;
  responsible_person_recno: number;
  doc_access_code: string;
  auto_dispatch: boolean;
}

function rowToSettings(row: SifSettingsRow): SifSettings {
  return {
    baseUrl: row.base_url,
    rpcPath: row.rpc_path,
    authMode: row.auth_mode as SifAuthMode,
    authkey: row.authkey,
    timeoutMs: row.timeout_ms,
    oauthClientId: row.oauth_client_id,
    oauthClientSecret: row.oauth_client_secret,
    oauthTokenUrl: row.oauth_token_url,
    oauthScope: row.oauth_scope,
    docArchive: row.doc_archive,
    docCategory: row.doc_category,
    docStatus: row.doc_status,
    docTitleTemplate: row.doc_title_template,
    docMainFileRelationType: row.doc_main_file_relation_type,
    docAttachmentRelationType: row.doc_attachment_relation_type,
    roleMunicipalitySender: row.role_municipality_sender,
    roleApplicantRecipient: row.role_applicant_recipient,
    roleCopyRecipient: row.role_copy_recipient ?? "KM",
    responsiblePersonRecno: row.responsible_person_recno,
    docAccessCode: row.doc_access_code ?? "",
    autoDispatch: row.auto_dispatch ?? false,
  };
}

// ── In-process settings cache ──────────────────────────────────────────────
// Avoids repeated Supabase DB roundtrips within the same server process.
// TTL: 60 s — short enough to pick up admin changes within a minute.
const CACHE_TTL_MS = 60_000;
let _settingsCache: { value: SifSettings; expiresAt: number } | null = null;

/** Invalidate the in-process settings cache (call after saving new settings). */
export function invalidateSifSettingsCache(): void {
  _settingsCache = null;
}

/**
 * Load SIF settings from the database.
 * Returns null if no row exists yet (not configured).
 */
export async function loadSifSettings(): Promise<SifSettings | null> {
  const supabase = await createServiceClient();
  const { data, error } = await supabase.from("sif_settings").select("*").maybeSingle();

  if (error) {
    console.error("[SIF settings] Failed to load from DB:", error.message);
    return null;
  }
  if (!data) return null;

  return rowToSettings(data as SifSettingsRow);
}

/**
 * Load SIF settings, falling back to environment variables when the DB row
 * does not exist or is incomplete.
 *
 * Results are cached in-process for CACHE_TTL_MS to avoid repeated DB
 * roundtrips. The cache is invalidated when settings are saved via the admin
 * API (call invalidateSifSettingsCache() there).
 */
export async function loadSifSettingsWithEnvFallback(): Promise<SifSettings> {
  const now = Date.now();
  if (_settingsCache && now < _settingsCache.expiresAt) {
    return _settingsCache.value;
  }

  const db = await loadSifSettings();

  const value: SifSettings = {
    baseUrl: db?.baseUrl || process.env.SIF_BASE_URL || "",
    rpcPath: db?.rpcPath || process.env.SIF_RPC_PATH || "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
    authMode: (db?.authMode || process.env.SIF_AUTH_MODE || "authkey") as SifAuthMode,
    authkey: db?.authkey || process.env.SIF_AUTHKEY || "",
    timeoutMs: db?.timeoutMs || Number(process.env.SIF_TIMEOUT_MS ?? "30000"),
    oauthClientId: db?.oauthClientId || process.env.SIF_CLIENT_ID || "",
    oauthClientSecret: db?.oauthClientSecret || process.env.SIF_CLIENT_SECRET || "",
    oauthTokenUrl: db?.oauthTokenUrl || process.env.SIF_BEARER_TOKEN_URL || "",
    oauthScope: db?.oauthScope || process.env.SIF_SCOPE || "",
    docArchive: db?.docArchive || sifMapping.inspectionReport.archive,
    docCategory: db?.docCategory || sifMapping.inspectionReport.category,
    docStatus: db?.docStatus || sifMapping.inspectionReport.status,
    docTitleTemplate: db?.docTitleTemplate || sifMapping.inspectionReport.titleTemplate,
    docMainFileRelationType:
      db?.docMainFileRelationType || sifMapping.inspectionReport.mainFileRelationType,
    docAttachmentRelationType:
      db?.docAttachmentRelationType || sifMapping.inspectionReport.attachmentRelationType,
    roleMunicipalitySender:
      db?.roleMunicipalitySender || sifMapping.contactRoles.municipalitySenderRole,
    roleApplicantRecipient:
      db?.roleApplicantRecipient || sifMapping.contactRoles.applicantRecipientRole,
    roleCopyRecipient: db?.roleCopyRecipient || sifMapping.contactRoles.copyRecipientRole,
    responsiblePersonRecno:
      db?.responsiblePersonRecno ?? sifMapping.defaults.responsiblePersonRecno,
    docAccessCode: db?.docAccessCode ?? "",
    autoDispatch: db?.autoDispatch ?? false,
  };

  _settingsCache = { value, expiresAt: now + CACHE_TTL_MS };
  return value;
}

/**
 * Convert SifSettings to the SifClientConfig shape expected by sifRpcCallWithConfig().
 */
export function toSifClientConfig(
  settings: SifSettings
): SifClientConfig & { authConfig: SifAuthConfig } {
  return {
    baseUrl: settings.baseUrl.replace(/\/$/, ""),
    rpcPath: settings.rpcPath,
    timeoutMs: settings.timeoutMs,
    authConfig: {
      mode: settings.authMode,
      authKey: settings.authkey || undefined,
      clientId: settings.oauthClientId || undefined,
      bearerTokenUrl: settings.oauthTokenUrl || undefined,
      clientSecret: settings.oauthClientSecret || undefined,
      clientIdOAuth: settings.oauthClientId || undefined,
      scope: settings.oauthScope || undefined,
    },
  };
}

/** Sanitised view of settings – strips sensitive secrets for the admin UI */
export function sanitizeForClient(settings: SifSettings): Omit<
  SifSettings,
  "authkey" | "oauthClientSecret"
> & {
  authkey: string; // masked
  oauthClientSecret: string; // masked
  hasAuthkey: boolean;
  hasOauthClientSecret: boolean;
} {
  return {
    ...settings,
    authkey: settings.authkey ? "••••••••" : "",
    oauthClientSecret: settings.oauthClientSecret ? "••••••••" : "",
    hasAuthkey: !!settings.authkey,
    hasOauthClientSecret: !!settings.oauthClientSecret,
  };
}
