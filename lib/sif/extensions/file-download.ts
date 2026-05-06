/**
 * File-download extension.
 *
 * Downloads the binary content of a SIF file using the URL found in
 * SifFileMetadata. Auth headers are applied automatically so protected
 * (non-public) archive files can be fetched server-side.
 *
 * Typical use: get the URL from getDocumentsWithFiles() in referred-cases.ts,
 * then pass it here to retrieve the actual bytes for attaching to a document.
 */

import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "../settings";
import { buildSifAuthHeaders } from "../auth";
import type { SifAuthConfig } from "../auth";
import type { SifFileMetadata } from "../types";

// ── Public types ───────────────────────────────────────────────────────────

export interface DownloadedFile {
  data: Buffer;
  fileName: string;
  /** Lowercase file extension without dot, e.g. "pdf" */
  format: string;
  /** Byte size of the downloaded content */
  size: number;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DOWNLOAD_TIMEOUT_MS = 30_000;

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Download a file from SIF using its URL (as found in SifFileMetadata.URL).
 *
 * Relative URLs are resolved against the configured SIF base URL.
 * Returns null on network error, 4xx/5xx, or if the URL is empty.
 */
export async function downloadFileByUrl(
  fileUrl: string,
  fileName: string,
  format: string,
  correlationId?: string
): Promise<DownloadedFile | null> {
  if (!fileUrl) return null;

  const settings = await loadSifSettingsWithEnvFallback();
  const config = toSifClientConfig(settings);

  // SIF often returns paths like "/Archive/..." — resolve against base URL
  let resolvedUrl = fileUrl.startsWith("http")
    ? fileUrl
    : `${settings.baseUrl.replace(/\/$/, "")}${fileUrl}`;

  // Auth strategy depends on mode:
  // - authkey: append as URL query param (same as RPC calls via buildRpcUrl)
  // - combined_daemon: send Authorization: Bearer header
  const fetchHeaders = await buildDownloadHeaders(config.authConfig);
  if (config.authConfig?.mode === "authkey" && config.authConfig.authKey) {
    const sep = resolvedUrl.includes("?") ? "&" : "?";
    resolvedUrl = `${resolvedUrl}${sep}authkey=${encodeURIComponent(config.authConfig.authKey)}`;
  }

  console.info("[SIF] downloadFileByUrl", {
    correlationId,
    fileName,
    url: resolvedUrl.slice(0, 80),
  });

  try {
    const res = await fetch(resolvedUrl, {
      method: "GET",
      headers: fetchHeaders as HeadersInit,
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.warn("[SIF] File download failed", {
        correlationId,
        fileName,
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    const data = Buffer.from(await res.arrayBuffer());

    console.info("[SIF] File downloaded", {
      correlationId,
      fileName,
      bytes: data.byteLength,
    });

    return { data, fileName, format: format.toLowerCase(), size: data.byteLength };
  } catch (err) {
    console.warn("[SIF] File download error", {
      correlationId,
      fileName,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Build fetch headers for a GET file download (no Content-Type, no authkey for authkey mode). */
async function buildDownloadHeaders(authConfig?: SifAuthConfig): Promise<Record<string, string>> {
  if (!authConfig || authConfig.mode === "authkey") {
    return {}; // authkey goes in the URL, not headers
  }
  const authHeaders = await buildSifAuthHeaders(authConfig);
  const { "Content-Type": _ct, ...rest } = authHeaders;
  return rest as Record<string, string>;
}

/**
 * Download a file directly from a SifFileMetadata object.
 * Convenience wrapper around downloadFileByUrl().
 */
export async function downloadSifFile(
  file: Pick<SifFileMetadata, "URL" | "Title" | "Format">,
  correlationId?: string
): Promise<DownloadedFile | null> {
  if (!file.URL) return null;
  return downloadFileByUrl(
    file.URL,
    file.Title ?? "unnamed",
    file.Format ?? "bin",
    correlationId
  );
}

/**
 * Download multiple files in parallel.
 * Files that fail are silently skipped — the returned array may be
 * shorter than the input if some downloads fail.
 */
export async function downloadSifFiles(
  files: Array<Pick<SifFileMetadata, "URL" | "Title" | "Format">>,
  correlationId?: string
): Promise<DownloadedFile[]> {
  const settled = await Promise.allSettled(
    files
      .filter((f) => f.URL)
      .map((f) => downloadSifFile(f, correlationId))
  );

  return settled
    .filter(
      (r): r is PromiseFulfilledResult<DownloadedFile | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((v): v is DownloadedFile => v !== null);
}
