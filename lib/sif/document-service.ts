// ============================================================
// SIF DocumentService - Create document on case
// ============================================================

import { sifRpcCall } from "./client";
import { loadSifSettingsWithEnvFallback } from "./settings";
import { SifCreateDocumentError } from "./errors";
import type {
  SifCreateDocumentInput,
  SifCreateDocumentResult,
  SifUpdateDocumentInput,
  SifUpdateDocumentResult,
  SifDispatchDocumentsInput,
  SifDispatchDocumentsResult,
  SifFileInput,
  SifGetDocumentsQuery,
  SifGetDocumentsResult,
  SifDocumentInCase,
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
    /** 360° internal recno — will be sent as ExternalId "recno:XXXX" per SIF API spec */
    recno?: number;
    /** Org.nr or personnummer. If absent, recno is used as ExternalId in "recno:XXXX" format. */
    referenceNumber?: string;
  }>;
  /** Uploaded file references from FileService.Upload */
  files: Array<{
    title: string;
    format: string;              // e.g. "pdf", "jpg"
    uploadedFileReference: string;
    relationType?: string;       // e.g. "H" for main document
  }>;
  additionalFields?: Array<{ name: string; value: string }>;
  /** Recno of the case stage to link the document to. Sent as AdditionalListFields if provided. */
  stageRecno?: number;
  /** Title of the stage — used as the Name in AdditionalListFields. */
  stageName?: string;
  documentDate?: string;         // ISO date
  /** Explicit access code (tilgangskode). When set, 360° skips access-code inheritance from file sub-items. */
  accessCode?: string;
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
    stageRecno,
    stageName,
    documentDate,
    accessCode,
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
    ...(accessCode ? { AccessCode: accessCode } : {}),
    ...(responsiblePersonRecno ? { ResponsiblePersonRecno: responsiblePersonRecno } : {}),
    ...(contacts?.length
      ? {
          Contacts: contacts.map((c) => ({
            Role: c.role,
            // SIF API identifies contacts via ExternalId or ReferenceNumber.
            // When only recno is known, use "recno:XXXX" format per SIF spec.
            ExternalId: c.referenceNumber ?? (c.recno ? `recno:${c.recno}` : undefined),
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

  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");
  const rawUrl = result.URL ?? "";
  const docUrl = rawUrl.startsWith("/") ? `${baseUrl}${rawUrl}` : rawUrl;

  return {
    recno: result.Recno ?? 0,
    documentNumber: result.DocumentNumber,
    title,
    url: docUrl || undefined,
    raw: result,
  };
}

/**
 * Fetch all documents on a case via DocumentService/GetDocuments.
 * Returns a list suitable for display in a picker — Recno values match
 * directly what UpdateDocument expects.
 */
export async function fetchCaseDocumentsFromSif(
  caseNumber: string,
  correlationId?: string
): Promise<SifDocumentInCase[]> {
  const query: SifGetDocumentsQuery = {
    CaseNumber: caseNumber,
    MaxReturnedDocuments: 200,
    SortCriterion: "RecnoAscending",
  };

  console.info("[SIF] DocumentService/GetDocuments", { correlationId, caseNumber });

  const result = await sifRpcCall<SifGetDocumentsQuery, SifGetDocumentsResult>(
    "DocumentService",
    "GetDocuments",
    query,
    correlationId
  );

  if (!result.Successful || !result.Documents?.length) return [];

  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");

  return result.Documents.map((d) => ({
    ...d,
    URL: d.URL
      ? d.URL.startsWith("/") ? `${baseUrl}${d.URL}` : d.URL
      : undefined,
  }));
}

export interface UpdateInspectionDocumentInput {
  /** DocumentNumber is the required identifier for UpdateDocument in SIF (not Recno). */
  documentNumber: string;
  files: Array<{
    title: string;
    format: string;
    uploadedFileReference: string;
    relationType?: string;
  }>;
  contacts?: Array<{ role: string; recno?: number }>;
  additionalFields?: Array<{ name: string; value: string }>;
  stageRecno?: number;
  stageName?: string;
  correlationId?: string;
}

/**
 * Update an existing document in 360° by adding new file versions.
 * Used when the user wants to update a tilsynsrapport on an existing document
 * rather than creating a new one.
 */
export async function updateInspectionDocumentInSif(
  input: UpdateInspectionDocumentInput
): Promise<SifDocument> {
  const { documentNumber, files, contacts, additionalFields, stageRecno, stageName, correlationId } = input;

  const sifFiles: SifFileInput[] = files.map((f, idx) => ({
    Title: f.title,
    Format: f.format,
    UploadedFileReference: f.uploadedFileReference,
    RelationType: f.relationType ?? (idx === 0 ? "H" : "V"),
  }));

  const payload: SifUpdateDocumentInput = {
    DocumentNumber: documentNumber,
    Files: sifFiles,
  };

  console.info("[SIF] DocumentService/UpdateDocument payload (debug)", {
    correlationId,
    json: JSON.stringify({ parameter: payload }),
  });

  console.info("[SIF] DocumentService/UpdateDocument", {
    correlationId,
    documentNumber,
    fileCount: files.length,
  });

  const result = await sifRpcCall<SifUpdateDocumentInput, SifUpdateDocumentResult>(
    "DocumentService",
    "UpdateDocument",
    payload,
    correlationId,
    true
  );

  if (!result.Successful) {
    throw new SifCreateDocumentError(
      result.ErrorMessage ?? result.ErrorDetails ?? "UpdateDocument failed",
      result
    );
  }

  console.info("[SIF] Document updated", {
    correlationId,
    documentNumber: result.DocumentNumber ?? documentNumber,
  });

  const settings = await loadSifSettingsWithEnvFallback();
  const baseUrl = settings.baseUrl.replace(/\/$/, "");
  const rawUrl = result.URL ?? "";
  const docUrl = rawUrl.startsWith("/") ? `${baseUrl}${rawUrl}` : rawUrl;

  return {
    recno: result.Recno ?? 0,
    documentNumber: result.DocumentNumber ?? documentNumber,
    url: docUrl || undefined,
    raw: result,
  };
}

/**
 * Trigger the dispatch process for a document already created in 360°.
 * Identified by recno (preferred) or document number.
 * Returns whether dispatch was started successfully — does NOT confirm delivery.
 * Check status in 360° to confirm the dispatch completed.
 */
export async function dispatchDocumentsInSif(
  documents: Array<{ recno?: number; documentNumber?: string }>,
  correlationId?: string
): Promise<SifDispatchDocumentsResult> {
  const payload: SifDispatchDocumentsInput = {
    Documents: documents.map((d) => ({
      ...(d.recno ? { Recno: d.recno } : {}),
      ...(d.documentNumber ? { DocumentNumber: d.documentNumber } : {}),
    })),
  };

  console.info("[SIF] DocumentService/DispatchDocuments", {
    correlationId,
    documents,
  });

  const result = await sifRpcCall<SifDispatchDocumentsInput, SifDispatchDocumentsResult>(
    "DocumentService",
    "DispatchDocuments",
    payload,
    correlationId,
    true // write operation
  );

  console.info("[SIF] DispatchDocuments result", {
    correlationId,
    successful: result.Successful,
    errorMessage: result.ErrorMessage,
  });

  return result;
}
