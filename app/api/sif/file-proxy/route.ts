import { type NextRequest, NextResponse } from "next/server";
import { getAuthClient } from "@/lib/api-auth";
import { buildSifAuthHeaders } from "@/lib/sif/auth";
import { buildRpcUrl, sifRpcCall } from "@/lib/sif/client";
import { loadSifSettingsWithEnvFallback, toSifClientConfig } from "@/lib/sif/settings";
import { createClient as createCookieClient } from "@/lib/supabase/server";

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

interface TokenResult {
  FileVariantResult?: {
    FileReference?: string;
    VariantMetadata?: Array<{ FileExtension?: string }>;
  };
  Successful?: boolean;
}

async function resolveUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    const {
      data: { user },
    } = await getAuthClient(req).auth.getUser(token);
    if (user) return user;
  }
  const {
    data: { user },
  } = await (await createCookieClient()).auth.getUser();
  return user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recnoParam = req.nextUrl.searchParams.get("recno");
  const recno = recnoParam ? Number(recnoParam) : NaN;
  if (isNaN(recno) || !recno) {
    return NextResponse.json({ error: "recno er påkrevd" }, { status: 400 });
  }

  const formatParam = req.nextUrl.searchParams.get("format") ?? "";
  const titleParam = req.nextUrl.searchParams.get("title") ?? "fil";

  // Step 1: generate short-lived download token
  const tokenResult = await sifRpcCall<object, TokenResult>(
    "FileService",
    "GenerateFileVariantsDownloadToken",
    { FileRecno: recno, IncludeMetadata: true },
    undefined,
    true
  ).catch(() => null);

  const fileReference = tokenResult?.FileVariantResult?.FileReference;
  if (!fileReference) {
    return NextResponse.json({ error: "Nedlastingstoken ikke tilgjengelig" }, { status: 404 });
  }

  const variantExt = tokenResult?.FileVariantResult?.VariantMetadata?.[0]?.FileExtension?.replace(
    /^\./,
    ""
  );
  const format = (formatParam || variantExt || "").toLowerCase();

  // Step 2: fetch file via GetFile RPC — authkey is in URL via buildRpcUrl
  const settings = await loadSifSettingsWithEnvFallback();
  const config = toSifClientConfig(settings);
  const rpcUrl = buildRpcUrl(config, "FileService", "GetFile");
  const authHeaders = await buildSifAuthHeaders(config.authConfig);

  const fileResponse = await fetch(rpcUrl, {
    method: "POST",
    headers: authHeaders as unknown as HeadersInit,
    body: JSON.stringify({ parameter: { Recno: recno, FileReferenceToken: fileReference } }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => null);

  if (!fileResponse?.ok) {
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  const responseCt = fileResponse.headers.get("Content-Type") ?? "";
  if (responseCt.includes("application/json")) {
    const body = await fileResponse.json().catch(() => null);
    const msg = body?.ErrorMessage ?? body?.Message ?? "Fil ikke funnet";
    return NextResponse.json({ error: msg }, { status: 404 });
  }

  const fileData = Buffer.from(await fileResponse.arrayBuffer());
  const mimeType =
    FORMAT_MIME[format] || responseCt.split(";")[0].trim() || "application/octet-stream";
  const safeName = titleParam.replace(/[^\w\s.-]/g, "_");
  const filename = format ? `${safeName}.${format}` : safeName;
  const isInline = mimeType.startsWith("image/");

  return new NextResponse(new Uint8Array(fileData), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(fileData.byteLength),
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
