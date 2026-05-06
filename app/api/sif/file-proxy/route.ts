import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sifRpcCall, buildRpcUrl } from "@/lib/sif/client";
import { buildSifAuthHeaders } from "@/lib/sif/auth";
import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "@/lib/sif/settings";

const FORMAT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  xml: "application/xml",
  json: "application/json",
};

interface GenerateTokenResult {
  FileVariantResult?: {
    FileReference?: string;
    VariantMetadata?: Array<{ FileExtension?: string; Path?: string }>;
  };
  Successful?: boolean;
  ErrorMessage?: string;
}

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const recnoParam = req.nextUrl.searchParams.get("recno");
  const recno = recnoParam ? Number(recnoParam) : NaN;
  if (!recno || isNaN(recno)) {
    return NextResponse.json({ error: "recno er påkrevd" }, { status: 400 });
  }

  const formatParam = req.nextUrl.searchParams.get("format") ?? "";
  const titleParam = req.nextUrl.searchParams.get("title") ?? "fil";

  // Step 1: Generate a short-lived download token for the file
  const tokenResult = await sifRpcCall<object, GenerateTokenResult>(
    "FileService",
    "GenerateFileVariantsDownloadToken",
    { FileRecno: recno, IncludeMetadata: true },
    undefined,
    true
  ).catch(() => null);

  const fileReference = tokenResult?.FileVariantResult?.FileReference;
  if (!fileReference) {
    return NextResponse.json({ error: "Kunne ikke hente nedlastingstoken fra SIF" }, { status: 404 });
  }

  const variantExt = tokenResult?.FileVariantResult?.VariantMetadata?.[0]?.FileExtension?.replace(/^\./, "");
  const format = (formatParam || variantExt || "").toLowerCase();

  // Step 2: Fetch the file via GetFile using the token
  const settings = await loadSifSettingsWithEnvFallback();
  const config = toSifClientConfig(settings);
  const url = buildRpcUrl(config, "FileService", "GetFile");
  const authHeaders = await buildSifAuthHeaders(config.authConfig);

  const fileResponse = await fetch(url, {
    method: "POST",
    headers: authHeaders as HeadersInit,
    body: JSON.stringify({ parameter: { Recno: recno, FileReferenceToken: fileReference } }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (!fileResponse?.ok) {
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  const responseContentType = fileResponse.headers.get("Content-Type") ?? "";

  // If SIF returns JSON it's an error envelope — not binary file content
  if (responseContentType.includes("application/json")) {
    const err = await fileResponse.json().catch(() => null);
    const msg = err?.ErrorMessage ?? err?.Message ?? "Fil ikke funnet";
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  const fileData = Buffer.from(await fileResponse.arrayBuffer());
  const mimeType =
    FORMAT_MIME[format] ||
    responseContentType.split(";")[0].trim() ||
    "application/octet-stream";

  const safeName = titleParam.replace(/[^\w\s.-]/g, "_");
  const filename = format ? `${safeName}.${format}` : safeName;
  const isInline = mimeType.startsWith("image/") || mimeType === "application/pdf";

  return new NextResponse(new Uint8Array(fileData), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(fileData.byteLength),
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
