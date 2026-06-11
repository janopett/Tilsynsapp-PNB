/**
 * Tests for SIF authentication header building and token caching.
 * @jest-environment node
 *
 * Note: jest.resetModules() is used in beforeEach so that the module-level
 * tokenCache is cleared between tests. Error classes are also re-imported from
 * the fresh module instance to ensure instanceof works correctly.
 */

type AuthModule = typeof import("@/lib/sif/auth");
type ErrorModule = typeof import("@/lib/sif/errors");

let buildSifAuthHeaders: AuthModule["buildSifAuthHeaders"];
let maskAuthHeaders: AuthModule["maskAuthHeaders"];
let getSifAuthConfig: AuthModule["getSifAuthConfig"];
let SifAuthErr: ErrorModule["SifAuthenticationError"];

beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  const authMod: AuthModule = require("@/lib/sif/auth");
  const errMod: ErrorModule = require("@/lib/sif/errors");
  buildSifAuthHeaders = authMod.buildSifAuthHeaders;
  maskAuthHeaders = authMod.maskAuthHeaders;
  getSifAuthConfig = authMod.getSifAuthConfig;
  SifAuthErr = errMod.SifAuthenticationError;
});

afterEach(() => {
  jest.useRealTimers();
  delete process.env.SIF_AUTH_MODE;
  delete process.env.SIF_AUTHKEY;
});

// ── authkey mode ─────────────────────────────────────────────────────────────

describe("buildSifAuthHeaders – authkey mode", () => {
  it("returns AuthKey header when key is set", async () => {
    const headers = await buildSifAuthHeaders({ mode: "authkey", authKey: "test-key-123" });
    expect(headers.AuthKey).toBe("test-key-123");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("throws SifAuthenticationError when authKey is missing", async () => {
    await expect(buildSifAuthHeaders({ mode: "authkey" })).rejects.toBeInstanceOf(SifAuthErr);
  });
});

// ── combined_daemon mode ──────────────────────────────────────────────────────

const daemonConfig = {
  mode: "combined_daemon" as const,
  clientId: "client-123",
  bearerTokenUrl: "https://login.example.com/token",
  clientIdOAuth: "oauth-client-id",
  clientSecret: "s3cr3t",
  scope: "openid",
};

function makeTokenResponse(token: string, expiresIn = 3600) {
  return new Response(
    JSON.stringify({ access_token: token, expires_in: expiresIn, token_type: "Bearer" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

describe("buildSifAuthHeaders – combined_daemon mode", () => {
  it("fetches bearer token and returns Authorization header", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeTokenResponse("my-token"));
    const headers = await buildSifAuthHeaders(daemonConfig);
    expect(headers.Authorization).toBe("Bearer my-token");
    expect(headers["ClientID"]).toBe("client-123");
  });

  it("caches the token on repeated calls within expiry window", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeTokenResponse("cached-token"));
    await buildSifAuthHeaders(daemonConfig);
    await buildSifAuthHeaders(daemonConfig);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches token after expiry (60s buffer)", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeTokenResponse("token-1", 120))
      .mockResolvedValueOnce(makeTokenResponse("token-2", 120));

    await buildSifAuthHeaders(daemonConfig);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Token expires in 120 s, buffer is 60 s → refresh needed after 60 s
    jest.advanceTimersByTime(61 * 1000);
    const headers = await buildSifAuthHeaders(daemonConfig);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(headers.Authorization).toBe("Bearer token-2");
  });

  it("throws when required credentials are missing", async () => {
    await expect(
      buildSifAuthHeaders({ mode: "combined_daemon", bearerTokenUrl: undefined })
    ).rejects.toBeInstanceOf(SifAuthErr);
  });

  it("throws when token endpoint returns HTTP error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
    await expect(buildSifAuthHeaders(daemonConfig)).rejects.toBeInstanceOf(SifAuthErr);
  });

  it("throws when response has no access_token field", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ token_type: "Bearer" }), { status: 200 })
      );
    await expect(buildSifAuthHeaders(daemonConfig)).rejects.toBeInstanceOf(SifAuthErr);
  });

  it("omits ClientID header when clientId is absent", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeTokenResponse("t"));
    const headers = await buildSifAuthHeaders({ ...daemonConfig, clientId: undefined });
    expect(headers["ClientID"]).toBeUndefined();
  });
});

// ── getSifAuthConfig ──────────────────────────────────────────────────────────

describe("getSifAuthConfig", () => {
  it("defaults to authkey mode", () => {
    expect(getSifAuthConfig().mode).toBe("authkey");
  });

  it("reads authkey from SIF_AUTHKEY env var", () => {
    process.env.SIF_AUTHKEY = "env-key";
    expect(getSifAuthConfig().authKey).toBe("env-key");
  });

  it("throws for invalid SIF_AUTH_MODE value", () => {
    process.env.SIF_AUTH_MODE = "invalid";
    expect(() => getSifAuthConfig()).toThrow();
  });
});

// ── maskAuthHeaders ───────────────────────────────────────────────────────────

describe("maskAuthHeaders", () => {
  it("masks AuthKey header value", () => {
    const masked = maskAuthHeaders({ AuthKey: "secret-key-12345" });
    expect(masked.AuthKey).toMatch(/\*{4}/);
    expect(masked.AuthKey).not.toContain("secret");
  });

  it("masks Authorization header value", () => {
    const masked = maskAuthHeaders({ Authorization: "Bearer token-abc" });
    expect(masked.Authorization).toMatch(/\*{4}/);
  });

  it("passes through non-sensitive headers unchanged", () => {
    const masked = maskAuthHeaders({ "Content-Type": "application/json" });
    expect(masked["Content-Type"]).toBe("application/json");
  });

  it("shows (empty) for empty sensitive header values", () => {
    const masked = maskAuthHeaders({ AuthKey: "" });
    expect(masked.AuthKey).toBe("(empty)");
  });
});
