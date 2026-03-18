// ============================================================
// SIF DocumentService - Create document on case
// ============================================================

import { sifRpcCall } from "./client";
import { SifCreateDocumentError } from "./errors";
import type {
  SifCreateDocumentInput,
  SifCreateDocumentResult,
  SifFileInput,
} from "./types";
import type { SifDocument, SifUploadedFileReference } from "@/types";

export interface CreateInspectionDocumentInput {
  /** The case number (saksnummer) to attach the document to */
  caseNumber: string;
  /** Document title */
  title: string;
  /** Archive code or recno. Configure in sif-mapping.ts */
  archive?: string;
  /** Category code or recno. Configure in sif-mapping.ts */
  category?: string;
  /** Status code or recno. Configure in sif-mapping.ts */
  status?: string;
  /** Recno of responsible person */
  responsiblePersonRecno?: number;
  /** Document contacts */
  contacts?: Array<{
    role: string;
    externalId: string;
    externalSystem?: string;
  }>;
  /** Uploaded file references from FileService.Upload */
  files: Array<{
    title: string;
    format: string;              // e.g. "pdf", "jpg"
    uploadedFileReference: string;
    relationType?: string;       // e.g. "H" for main document
  }>;
  additionalFields?: Array<{ name: string; value: string }>;
  documentDate?: string;         // ISO date
  correlationId?: string;
}

/**
 * Create a document on an existing 360° case via SIF DocumentService.
 * The files must already be uploaded via FileService.Upload.
 */
export async function createInspectionDocumentInSif(
  input: CreateInspectionDocumentInput
): Promise<SifDocument> {
  const {
    caseNumber,
    title,
    archive,
    category,
    status,
    responsiblePersonRecno,
    contacts,
    files,
    additionalFields,
    documentDate,
    correlationId,
  } = input;

  const sifFiles: SifFileInput[] = files.map((f, idx) => ({
    Title: f.title,
    Format: f.format,
    UploadedFileReference: f.uploadedFileReference,
    RelationType: f.relationType ?? (idx === 0 ? "H" : "V"), // H=main, V=attachment
  }));

  const payload: SifCreateDocumentInput = {
    Title: title,
    CaseNumber: caseNumber,
    Archive: archive,
    Category: category,
    Status: status,
    Files: sifFiles,
    DocumentDate: documentDate ?? new Date().toISOString().slice(0, 10),
    ...(responsiblePersonRecno ? { ResponsiblePersonRecno: responsiblePersonRecno } : {}),
    ...(contacts?.length
      ? {
          Contacts: contacts.map((c) => ({
            Role: c.role,
            ExternalId: c.externalId,
            ExternalSystem: c.externalSystem,
          })),
        }
      : {}),
    ...(additionalFields?.length
      ? {
          AdditionalFields: additionalFields.map((f) => ({
            Name: f.name,
            Value: f.value,
          })),
        }
      : {}),
  };

  console.info("[SIF] DocumentService/CreateDocument", {
    correlationId,
    caseNumber,
    title,
    fileCount: files.length,
    category,
    status,
  });

  const result = await sifRpcCall<SifCreateDocumentInput, SifCreateDocumentResult>(
    "DocumentService",
    "CreateDocument",
    payload,
    correlationId,
    true // write operation: wrap in {"parameter": ...}
  );

  if (!result.Successful) {
    throw new SifCreateDocumentError(
      result.ErrorMessage ?? result.ErrorDetails ?? "Unknown error",
      result
    );
  }

  console.info("[SIF] Document created", {
    correlationId,
    recno: result.Recno,
    documentNumber: result.DocumentNumber,
    url: result.URL,
  });

  return {
    recno: result.Recno ?? 0,
    documentNumber: result.DocumentNumber,
    title,
    url: result.URL,
    raw: result,
  };
}
