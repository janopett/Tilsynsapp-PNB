import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/api-auth";
import { sifRpcCall } from "@/lib/sif/client";
import type { SifGetFilesWithMetadataQuery, SifGetFilesWithMetadataResult } from "@/lib/sif/types";

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

  const recnoParam = req.nextUrl.searchParams.get("recno");
  const recno = recnoParam ? Number(recnoParam) : NaN;
  if (!recno || isNaN(recno)) {
    return NextResponse.json({ error: "recno er påkrevd" }, { status: 400 });
  }

  const query: SifGetFilesWithMetadataQuery = {
    Recno: recno,
    IncludeFileData: true,
  };

  const result = await sifRpcCall<SifGetFilesWithMetadataQuery, SifGetFilesWithMetadataResult>(
    "FileService",
    "GetFilesWithMetadata",
    query
  ).catch(() => null);

  if (!result?.Successful || !result.Files?.length) {
    return NextResponse.json({ error: "Fil ikke funnet" }, { status: 404 });
  }

  const file = result.Files[0];
  if (!file.Base64Data) {
    return NextResponse.json({ error: "Ingen fildata returnert fra SIF" }, { status: 404 });
  }

  const format = file.Format?.toLowerCase() ?? "";
  const mimeType = FORMAT_MIME[format] ?? "application/octet-stream";
  const fileData = Buffer.from(file.Base64Data, "base64");
  const safeName = (file.Title ?? "fil").replace(/[^\w\s.-]/g, "_");
  const filename = format ? `${safeName}.${format}` : safeName;

  const isInline = mimeType.startsWith("image/") || mimeType === "application/pdf";

  return new NextResponse(fileData, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(fileData.byteLength),
      "Content-Disposition": `${isInline ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
