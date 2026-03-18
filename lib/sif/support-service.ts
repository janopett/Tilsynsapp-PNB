// ============================================================
// SIF SupportService - Health check, version, connection test
// ============================================================

import { sifRpcCall } from "./client";
import type { SifGetVersionResult } from "./types";
import type { SifVersion } from "@/types";

/**
 * Get SIF API version (health check).
 */
export async function getSifVersion(correlationId?: string): Promise<SifVersion> {
  console.info("[SIF] SupportService/GetSIFVersion", { correlationId });

  const result = await sifRpcCall<Record<string, never>, SifGetVersionResult>(
    "SupportService",
    "GetSIFVersion",
    {},
    correlationId
  );

  // GetSIFVersion may return a plain text string (e.g. "6.9.215") wrapped in _raw,
  // or a JSON object with SIFVersion field — handle both.
  const rawVersion = (result as unknown as { _raw?: string })._raw;
  return {
    version: result.SIFVersion ?? rawVersion ?? "(versjon ikke tilgjengelig)",
    buildDate: result.BuildDate,
  };
}

/**
 * Test the SIF connection by calling GetSIFVersion.
 * Returns true if reachable and authenticated, throws on failure.
 */
export async function testSifConnection(): Promise<{
  ok: boolean;
  version?: string;
  error?: string;
}> {
  try {
    const ver = await getSifVersion("healthcheck");
    return { ok: true, version: ver.version };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}
