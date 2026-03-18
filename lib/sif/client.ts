// ============================================================
// SIF RPC Base Client
// Handles: URL construction, request dispatch, retry, error mapping
// ============================================================

import { buildSifAuthHeaders, maskAuthHeaders } from "./auth";
import {
  mapHttpErrorToSifError,
  SifRateLimitError,
  SifTimeoutError,
} from "./errors";
import type { SifAuthConfig } from "./auth";
import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "./settings";

export interface SifClientConfig {
  baseUrl: string;
  rpcPath: string;
  timeoutMs: number;
  authConfig?: SifAuthConfig;
}

export function getSifClientConfig(): SifClientConfig {
  const baseUrl = process.env.SIF_BASE_URL;
  if (!baseUrl) {
    throw new Error("SIF_BASE_URL environment variable is not set.");
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    rpcPath: process.env.SIF_RPC_PATH ?? "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
    timeoutMs: Number(process.env.SIF_TIMEOUT_MS ?? "30000"),
  };
}

/**
 * Build a SIF RPC URL.
 * Pattern: {baseUrl}{rpcPath}/{service}/{method}
 * If authKey is provided it is appended as ?authkey=... (Public 360 style).
 * E.g.: https://customer.public360online.com/Biz/v2/api/call/SI.Data.RPC/CaseService/GetCases?authkey=<guid>
 */
export function buildRpcUrl(
  config: SifClientConfig,
  service: string,
  method: string
): string {
  const base = `${config.baseUrl}${config.rpcPath}/${service}/${method}`;
  const authKey = config.authConfig?.authKey;
  return authKey ? `${base}?authkey=${encodeURIComponent(authKey)}` : base;
}

/**
 * Execute a SIF RPC call.
 * Handles: auth headers, timeout, HTTP error mapping, retry on 429.
 */
export async function sifRpcCall<TInput, TOutput>(
  service: string,
  method: string,
  payload: TInput,
  correlationId?: string
): Promise<TOutput> {
  const settings = await loadSifSettingsWithEnvFallback();
  const config = toSifClientConfig(settings);

  if (!config.baseUrl) {
    throw new Error("SIF_BASE_URL environment variable is not set.");
  }

  return sifRpcCallWithConfig<TInput, TOutput>(
    config,
    service,
    method,
    payload,
    correlationId
  );
}

export async function sifRpcCallWithConfig<TInput, TOutput>(
  config: SifClientConfig,
  service: string,
  method: string,
  payload: TInput,
  correlationId?: string,
  retryCount = 0
): Promise<TOutput> {
  const url = buildRpcUrl(config, service, method);
  const authHeaders = await buildSifAuthHeaders(config.authConfig);
  const headers = { ...authHeaders };

  const logCtx = {
    correlationId,
    service,
    method,
    url,
    headers: maskAuthHeaders(headers as Record<string, string>),
    retryCount,
  };

  console.info("[SIF] RPC call", logCtx);
  const startMs = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: headers as HeadersInit,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new SifTimeoutError(config.timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  const durationMs = Date.now() - startMs;
  console.info("[SIF] RPC response", {
    correlationId,
    service,
    method,
    status: response.status,
    durationMs,
  });

  if (response.status === 429 && retryCount < 3) {
    // Exponential backoff: 2s, 4s, 8s
    const retryAfterHeader = response.headers.get("retry-after");
    const waitMs = retryAfterHeader
      ? parseInt(retryAfterHeader, 10) * 1000
      : Math.pow(2, retryCount + 1) * 1000;

    console.warn("[SIF] Rate limited, retrying", {
      correlationId,
      service,
      method,
      retryCount,
      waitMs,
    });
    await sleep(waitMs);
    return sifRpcCallWithConfig<TInput, TOutput>(
      config,
      service,
      method,
      payload,
      correlationId,
      retryCount + 1
    );
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => null);
    }
    console.error("[SIF] RPC error", {
      correlationId,
      service,
      method,
      status: response.status,
      body,
    });

    // Detect Public 360 error envelope: { Type, CorrelationId, ExceptionType, Message }
    if (
      body &&
      typeof body === "object" &&
      (body as Record<string, unknown>).Type === "Error"
    ) {
      const err = body as Record<string, unknown>;
      const msg =
        `360-feil (${err.ExceptionType ?? "ukjent"}): ${err.Message ?? "Ingen melding"}` +
        (err.CorrelationId ? `\nCorrelationId: ${err.CorrelationId}` : "");
      throw new Error(msg);
    }

    throw mapHttpErrorToSifError(response.status, body, `${service}/${method}`);
  }

  let result: TOutput;
  try {
    result = (await response.json()) as TOutput;
  } catch {
    const text = await response.text().catch(() => "");
    const preview = text.slice(0, 120).replace(/\s+/g, " ").trim();
    throw new Error(
      `Serveren svarte ikke med gyldig JSON (HTTP ${response.status}).\n` +
      `URL: ${url}\n` +
      `Svar: ${preview || "(tomt)"}\n\n` +
      `Sjekk at Base URL og RPC-sti er riktig konfigurert.`
    );
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
