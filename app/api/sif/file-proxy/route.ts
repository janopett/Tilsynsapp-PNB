import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { downloadFileByUrl } from "@/lib/sif/extensions/file-download";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";

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
};

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;

  const urlParam = req.nextUrl.searchParams.get("url");
  const formatParam = req.nextUrl.searchParams.get("format") ?? "";
  const titleParam = req.nextUrl.searchParams.get("title") ?? "fil";

  if (!urlParam) {
    return NextResponse.json({ error: "url er påkrevd" }, { status: 400 });
  }

  const fileUrl = decodeURIComponent(urlParam);

  // SSRF-beskyttelse: valider at URLen tilhører SIF-verten
  if (fileUrl.startsWith("http")) {
    const settings = await loadSifSettingsWithEnvFallback();
    const sifHostname = new URL(settings.baseUrl).hostname;
    try {
      const fileHostname = new URL(fileUrl).hostname;
      if (fileHostname !== sifHostname) {
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

  const format = downloaded.format.toLowerCase();
  const mimeType = FORMAT_MIME[format] ?? "application/octet-stream";
  const safeName = downloaded.fileName.replace(/[^\w\s.-]/g, "_");
  const filename = format ? `${safeName}.${format}` : safeName;
  const isInline = mimeType.startsWith("image/") || mimeType === "application/pdf";

  return new NextResponse(new Uint8Array(downloaded.data), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(downloaded.data.byteLength),
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
