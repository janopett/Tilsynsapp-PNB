// ============================================================
// SIF Authentication
// Supports: authkey | combined_daemon (client credentials + AuthKey)
// All secrets come from environment variables — never from client code.
// ============================================================

import { SifAuthenticationError } from "./errors";
import type { SifAuthHeaders } from "./types";

export type SifAuthMode = "authkey" | "combined_daemon";

export interface SifAuthConfig {
  mode: SifAuthMode;
  // authkey mode
  authKey?: string;
  // combined_daemon mode (client credentials)
  clientId?: string;
  bearerTokenUrl?: string;
  clientSecret?: string;
  clientIdOAuth?: string;
  scope?: string;
}

// In-memory token cache for combined_daemon mode
interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}
let tokenCache: TokenCache | null = null;

export function getSifAuthConfig(): SifAuthConfig {
  const mode = (process.env.SIF_AUTH_MODE ?? "authkey") as SifAuthMode;
  if (mode !== "authkey" && mode !== "combined_daemon") {
    throw new Error(`Invalid SIF_AUTH_MODE: "${mode}". Must be "authkey" or "combined_daemon".`);
  }
  return {
    mode,
    authKey: process.env.SIF_AUTHKEY,
    clientId: process.env.SIF_CLIENT_ID,
    bearerTokenUrl: process.env.SIF_BEARER_TOKEN_URL,
    clientSecret: process.env.SIF_CLIENT_SECRET,
    clientIdOAuth: process.env.SIF_CLIENT_ID_OAUTH,
    scope: process.env.SIF_SCOPE,
  };
}

/**
 * Build the authentication headers for a SIF RPC call.
 * For authkey mode:  AuthKey header
 * For combined_daemon: Authorization: Bearer <token> + AuthKey + ClientID
 */
export async function buildSifAuthHeaders(config?: SifAuthConfig): Promise<SifAuthHeaders> {
  const cfg = config ?? getSifAuthConfig();

  if (cfg.mode === "authkey") {
    if (!cfg.authKey) {
      throw new SifAuthenticationError("SIF_AUTHKEY environment variable is not set.");
    }
    return {
      "Content-Type": "application/json",
      AuthKey: cfg.authKey,
    };
  }

  // combined_daemon: Client Credential Grant (CCGA).
  // AuthKey is configured server-side on the endpoint — do NOT send it in the request.
  // Only send Authorization: Bearer + optional ClientID.
  if (cfg.mode === "combined_daemon") {
    const bearerToken = await getBearerToken(cfg);
    const headers: SifAuthHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    };
    if (cfg.clientId) {
      headers["ClientID"] = cfg.clientId;
    }
    return headers;
  }

  throw new SifAuthenticationError(`Unsupported SIF_AUTH_MODE: ${cfg.mode}`);
}

async function getBearerToken(cfg: SifAuthConfig): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  if (!cfg.bearerTokenUrl || !cfg.clientIdOAuth || !cfg.clientSecret) {
    throw new SifAuthenticationError(
      "SIF_BEARER_TOKEN_URL, SIF_CLIENT_ID_OAUTH and SIF_CLIENT_SECRET must be set for combined_daemon auth."
    );
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: cfg.clientIdOAuth,
    client_secret: cfg.clientSecret,
    ...(cfg.scope ? { scope: cfg.scope } : {}),
  });

  const response = await fetch(cfg.bearerTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new SifAuthenticationError(
      `Failed to obtain bearer token (HTTP ${response.status}): ${body}`
    );
  }

  const json = await response.json();
  if (!json.access_token) {
    throw new SifAuthenticationError("Bearer token response did not contain access_token.");
  }

  const expiresIn: number = json.expires_in ?? 3600;
  tokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return tokenCache.token;
}

/** Mask sensitive header values for logging */
export function maskAuthHeaders(headers: Record<string, string>): Record<string, string> {
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (
      key.toLowerCase() === "authkey" ||
      key.toLowerCase() === "authorization" ||
      key.toLowerCase() === "clientid"
    ) {
      masked[key] = value ? `${value.slice(0, 4)}****` : "(empty)";
    } else {
      masked[key] = value;
    }
  }
  return masked;
}
