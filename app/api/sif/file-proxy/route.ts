import { NextRequest, NextResponse } from "next/server";
import { getAuthClient } from "@/lib/api-auth";
import { createClient as createCookieClient } from "@/lib/supabase/server";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import { downloadFileByUrl } from "@/lib/sif/extensions/file-download";

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

async function resolveUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    const { data: { user } } = await getAuthClient(req).auth.getUser(token);
    if (user) return user;
  }
  const { data: { user } } = await createCookieClient().auth.getUser();
  return user ?? null;
}

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const urlParam = req.nextUrl.searchParams.get("url");
  const formatParam = req.nextUrl.searchParams.get("format") ?? "";
  const titleParam = req.nextUrl.searchParams.get("title") ?? "fil";

  if (!urlParam) {
    return NextResponse.json({ error: "url er påkrevd" }, { status: 400 });
  }

  const fileUrl = decodeURIComponent(urlParam);

  // SSRF-beskyttelse: absolut URL må tilhøre SIF-verten
  if (fileUrl.startsWith("http")) {
    const settings = await loadSifSettingsWithEnvFallback();
    try {
      const sifHostname = new URL(settings.baseUrl).hostname;
      if (new URL(fileUrl).hostname !== sifHostname) {
        return NextResponse.json({ error: "Ugyldig URL" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Ugyldig URL" }, { status: 400 });
    }
  }

  const downloaded = await downloadFileByUrl(fileUrl, titleParam, formatParam);
  if (!downloaded) {
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  const format = formatParam.toLowerCase();
  const mimeType = FORMAT_MIME[format] || "application/octet-stream";
  const safeName = titleParam.replace(/[^\w\s.-]/g, "_");
  const filename = format ? `${safeName}.${format}` : safeName;
  const isInline = mimeType.startsWith("image/");

  return new NextResponse(new Uint8Array(downloaded.data), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(downloaded.size),
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
