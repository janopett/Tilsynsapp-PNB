// ============================================================
// SIF FileService - Upload files to 360°
// ============================================================

import { sifRpcCall } from "./client";
import { SifUploadError, SifValidationError } from "./errors";
import type { SifUploadInput, SifUploadResult } from "./types";
import type { SifUploadedFileReference } from "@/types";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export interface UploadFileInput {
  fileName: string;       // Must include extension, e.g. "rapport.pdf"
  fileData: Buffer | Uint8Array;
  mimeType?: string;
  correlationId?: string;
}

/**
 * Upload a single file to SIF FileService.
 * Returns the FileReference needed for CreateDocument.
 */
export async function uploadFileToSif(
  input: UploadFileInput
): Promise<SifUploadedFileReference> {
  const { fileName, fileData, correlationId } = input;

  // Validate filename has extension
  const extMatch = fileName.match(/\.([a-zA-Z0-9]+)$/);
  if (!extMatch) {
    throw new SifValidationError(
      `File name "${fileName}" must include a file extension (e.g. ".pdf", ".jpg").`
    );
  }
  const fileFormat = extMatch[1].toLowerCase();

  if (fileData.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new SifValidationError(
      `File "${fileName}" exceeds maximum size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`
    );
  }

  const base64Data = Buffer.from(fileData).toString("base64");

  const payload: SifUploadInput = {
    FileData: base64Data,
    FileName: fileName,
    FileFormat: fileFormat,
  };

  console.info("[SIF] FileService/Upload", {
    correlationId,
    fileName,
    fileFormat,
    sizeBytes: fileData.byteLength,
  });

  const result = await sifRpcCall<SifUploadInput, SifUploadResult>(
    "FileService",
    "Upload",
    payload,
    correlationId,
    true // write operation: wrap in {"parameter": ...}
  );

  if (!result.Successful || !result.FileReference) {
    throw new SifUploadError(
      fileName,
      result.ErrorMessage ?? result.ErrorDetails ?? "Unknown error",
      result
    );
  }

  console.info("[SIF] File uploaded successfully", {
    correlationId,
    fileName,
    fileReference: result.FileReference?.slice(0, 8) + "...",
  });

  return {
    fileReference: result.FileReference,
    fileName,
  };
}

/**
 * Upload multiple files in parallel and return all references.
 * Order is preserved (matches input array order).
 */
export async function uploadFilesToSif(
  files: UploadFileInput[]
): Promise<SifUploadedFileReference[]> {
  return Promise.all(files.map((file) => uploadFileToSif(file)));
}

/**
 * Derive file format from MIME type when no extension is available.
 */
export function mimeTypeToFormat(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
  };
  return map[mimeType] ?? "bin";
}
