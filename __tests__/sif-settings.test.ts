/**
 * Tests for SIF settings loading, env fallback, caching, and helpers.
 * @jest-environment node
 */

let maybeSingleResult: { data: unknown; error: unknown } = { data: null, error: null };

jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: jest.fn().mockImplementation(async () => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockImplementation(() => Promise.resolve(maybeSingleResult)),
      }),
    }),
  })),
}));

import {
  invalidateSifSettingsCache,
  loadSifSettingsWithEnvFallback,
  sanitizeForClient,
  toSifClientConfig,
} from "@/lib/sif/settings";
import { sifMapping } from "@/config/sif-mapping";

beforeEach(() => {
  jest.clearAllMocks();
  invalidateSifSettingsCache();
  maybeSingleResult = { data: null, error: null };
  delete process.env.SIF_BASE_URL;
  delete process.env.SIF_AUTHKEY;
  delete process.env.SIF_AUTH_MODE;
});

// ── env fallback ────────────────────────────────────────────────────────────

describe("loadSifSettingsWithEnvFallback – no DB row", () => {
  it("falls back to SIF_BASE_URL env var", async () => {
    process.env.SIF_BASE_URL = "https://env-example.com";
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.baseUrl).toBe("https://env-example.com");
  });

  it("falls back to SIF_AUTHKEY env var", async () => {
    process.env.SIF_AUTHKEY = "env-authkey";
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.authkey).toBe("env-authkey");
  });

  it("uses sifMapping defaults for document fields", async () => {
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.docArchive).toBe(sifMapping.inspectionReport.archive);
    expect(s.docCategory).toBe(sifMapping.inspectionReport.category);
    expect(s.docStatus).toBe(sifMapping.inspectionReport.status);
  });

  it("defaults authMode to authkey", async () => {
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.authMode).toBe("authkey");
  });

  it("defaults autoDispatch to false", async () => {
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.autoDispatch).toBe(false);
  });
});

// ── DB row ──────────────────────────────────────────────────────────────────

describe("loadSifSettingsWithEnvFallback – with DB row", () => {
  const dbRow = {
    id: "1",
    base_url: "https://db-example.com",
    rpc_path: "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
    auth_mode: "authkey",
    authkey: "db-key",
    timeout_ms: 15000,
    oauth_client_id: "",
    oauth_client_secret: "",
    oauth_token_url: "",
    oauth_scope: "",
    doc_archive: "recno:5",
    doc_category: "recno:200",
    doc_status: "J",
    doc_title_template: "{{title}} - {{date}}",
    doc_main_file_relation_type: "H",
    doc_attachment_relation_type: "V",
    role_municipality_sender: "AV",
    role_applicant_recipient: "Mottaker",
    role_copy_recipient: "KM",
    responsible_person_recno: 42,
    doc_access_code: "",
    auto_dispatch: true,
  };

  beforeEach(() => {
    maybeSingleResult = { data: dbRow, error: null };
  });

  it("prefers DB values over env vars", async () => {
    process.env.SIF_BASE_URL = "https://env-should-be-ignored.com";
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.baseUrl).toBe("https://db-example.com");
  });

  it("maps all DB fields correctly", async () => {
    const s = await loadSifSettingsWithEnvFallback();
    expect(s.docArchive).toBe("recno:5");
    expect(s.responsiblePersonRecno).toBe(42);
    expect(s.autoDispatch).toBe(true);
    expect(s.timeoutMs).toBe(15000);
  });
});

// ── cache ───────────────────────────────────────────────────────────────────

describe("settings cache", () => {
  it("returns cached value without hitting DB again within TTL", async () => {
    const { createServiceClient } = require("@/lib/supabase/server");
    await loadSifSettingsWithEnvFallback();
    await loadSifSettingsWithEnvFallback();
    expect(createServiceClient).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after invalidateSifSettingsCache()", async () => {
    const { createServiceClient } = require("@/lib/supabase/server");
    await loadSifSettingsWithEnvFallback();
    invalidateSifSettingsCache();
    await loadSifSettingsWithEnvFallback();
    expect(createServiceClient).toHaveBeenCalledTimes(2);
  });
});

// ── toSifClientConfig ────────────────────────────────────────────────────────

describe("toSifClientConfig", () => {
  const settings = {
    baseUrl: "https://example.com/",
    rpcPath: "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
    authMode: "authkey" as const,
    authkey: "my-key",
    timeoutMs: 10000,
    oauthClientId: "",
    oauthClientSecret: "",
    oauthTokenUrl: "",
    oauthScope: "",
    docArchive: "",
    docCategory: "",
    docStatus: "",
    docTitleTemplate: "",
    docMainFileRelationType: "H",
    docAttachmentRelationType: "V",
    roleMunicipalitySender: "AV",
    roleApplicantRecipient: "Mottaker",
    roleCopyRecipient: "KM",
    responsiblePersonRecno: 0,
    docAccessCode: "",
    autoDispatch: false,
  };

  it("strips trailing slash from baseUrl", () => {
    const config = toSifClientConfig(settings);
    expect(config.baseUrl).toBe("https://example.com");
  });

  it("passes through rpcPath and timeoutMs", () => {
    const config = toSifClientConfig(settings);
    expect(config.rpcPath).toBe("/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC");
    expect(config.timeoutMs).toBe(10000);
  });

  it("builds authConfig from settings", () => {
    const config = toSifClientConfig(settings);
    expect(config.authConfig.mode).toBe("authkey");
    expect(config.authConfig.authKey).toBe("my-key");
  });
});

// ── sanitizeForClient ────────────────────────────────────────────────────────

describe("sanitizeForClient", () => {
  const settings = {
    baseUrl: "https://example.com",
    rpcPath: "/rpc",
    authMode: "authkey" as const,
    authkey: "real-secret",
    oauthClientSecret: "oauth-secret",
    timeoutMs: 30000,
    oauthClientId: "",
    oauthTokenUrl: "",
    oauthScope: "",
    docArchive: "",
    docCategory: "",
    docStatus: "",
    docTitleTemplate: "",
    docMainFileRelationType: "H",
    docAttachmentRelationType: "V",
    roleMunicipalitySender: "AV",
    roleApplicantRecipient: "Mottaker",
    roleCopyRecipient: "KM",
    responsiblePersonRecno: 0,
    docAccessCode: "",
    autoDispatch: false,
  };

  it("masks authkey", () => {
    const sanitized = sanitizeForClient(settings);
    expect(sanitized.authkey).toBe("••••••••");
    expect(sanitized.hasAuthkey).toBe(true);
  });

  it("masks oauthClientSecret", () => {
    const sanitized = sanitizeForClient(settings);
    expect(sanitized.oauthClientSecret).toBe("••••••••");
    expect(sanitized.hasOauthClientSecret).toBe(true);
  });

  it("shows empty string and false when secrets are absent", () => {
    const s = sanitizeForClient({ ...settings, authkey: "", oauthClientSecret: "" });
    expect(s.authkey).toBe("");
    expect(s.hasAuthkey).toBe(false);
    expect(s.hasOauthClientSecret).toBe(false);
  });
});
