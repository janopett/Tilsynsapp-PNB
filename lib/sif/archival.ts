// ============================================================
// SIF Archival Orchestrator
// Coordinates: case lookup → file upload → create document → persist
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { findCaseInSif } from "./case-service";
import { uploadFilesToSif } from "./file-service";
import { createInspectionDocumentInSif } from "./document-service";
import { loadSifSettingsWithEnvFallback } from "./settings";
import { buildDocumentTitle } from "@/config/sif-mapping";
import {
  SifError,
  SifCaseNotFoundError,
  SifMultipleCasesFoundError,
  SifUploadError,
  SifCreateDocumentError,
} from "./errors";
import type { ArchiveInspectionRequest, ArchiveInspectionResponse, InspectionArchival } from "@/types";

export interface ArchivalContext {
  inspectionId: string;
  caseNumber?: string;
  externalId?: string;
  uid?: string;
  propertyAddress: string;
  inspectionDate: string;
  // Optional metadata for title template variables
  caseTitle?: string;
  inspectorName?: string;
  applicantName?: string;
  gnr?: string;
  bnr?: string;
  measureTypeName?: string;
  pdfBuffer?: Buffer;
  pdfFileName?: string;
  jsonBuffer?: Buffer;
  jsonFileName?: string;
  attachments?: Array<{
    fileName: string;
    fileData: Buffer;
    mimeType: string;
  }>;
  /** Recno of the søker contact in 360°. Set as mottaker (roleApplicantRecipient) on the document. */
  applicantRecno?: number;
  /** Deltakere on the inspection. Set as kopimottakere (roleCopyRecipient), deduplicating søker. */
  participants?: Array<{ recno: number; name: string }>;
  additionalFields?: Array<{ name: string; value: string }>;
}

/**
 * Full archival flow:
 * 1. Find case in SIF
 * 2. Upload PDF report
 * 3. Upload attachment files
 * 4. Create document on case
 * Returns the archival result to be persisted in Supabase.
 */
export async function archiveInspectionToSif(
  ctx: ArchivalContext
): Promise<Omit<InspectionArchival, "id" | "created_at" | "updated_at">> {
  const correlationId = uuidv4();

  // Load document mapping from DB settings (admin-configurable)
  const settings = await loadSifSettingsWithEnvFallback();

  console.info("[SIF] Starting archival", {
    correlationId,
    inspectionId: ctx.inspectionId,
    caseNumber: ctx.caseNumber,
    propertyAddress: ctx.propertyAddress,
  });

  const requestPayload: Record<string, unknown> = {
    correlationId,
    inspectionId: ctx.inspectionId,
    caseNumber: ctx.caseNumber,
    propertyAddress: ctx.propertyAddress,
  };

  try {
    // Step 1: Find case
    const sifCase = await findCaseInSif({
      caseNumber: ctx.caseNumber,
      externalId: ctx.externalId,
      uid: ctx.uid,
      correlationId,
    });

    // Step 2 + 3: Upload files
    const filesToUpload: Array<{
      fileName: string;
      fileData: Buffer;
      mimeType?: string;
      correlationId?: string;
    }> = [];

    if (ctx.pdfBuffer && ctx.pdfFileName) {
      filesToUpload.push({
        fileName: ctx.pdfFileName,
        fileData: ctx.pdfBuffer,
        mimeType: "application/pdf",
        correlationId,
      });
    }

    if (ctx.jsonBuffer && ctx.jsonFileName) {
      filesToUpload.push({
        fileName: ctx.jsonFileName,
        fileData: ctx.jsonBuffer,
        mimeType: "application/json",
        correlationId,
      });
    }

    for (const att of ctx.attachments ?? []) {
      filesToUpload.push({
        ...att,
        correlationId,
      });
    }

    if (filesToUpload.length === 0) {
      throw new SifCreateDocumentError(
        "No files to archive. At least a PDF report is required."
      );
    }

    const uploadedRefs = await uploadFilesToSif(filesToUpload);

    // Step 4: Build document title
    const gnrBnr =
      ctx.gnr && ctx.bnr
        ? `${ctx.gnr}/${ctx.bnr}`
        : ctx.gnr ?? ctx.bnr ?? "";
    const year = ctx.inspectionDate?.slice(0, 4) ?? "";

    const title = buildDocumentTitle(
      settings.docTitleTemplate,
      {
        propertyAddress: ctx.propertyAddress,
        caseNumber: sifCase.caseNumber,
        caseTitle: ctx.caseTitle,
        date: ctx.inspectionDate,
        inspectorName: ctx.inspectorName,
        applicantName: ctx.applicantName,
        gnrBnr,
        measureType: ctx.measureTypeName,
        year,
        inspectionId: ctx.inspectionId,
      }
    );

    // Build files list for CreateDocument
    const docFiles = uploadedRefs.map((ref, idx) => {
      const isMain = idx === 0;
      const ext = ref.fileName.split(".").pop()?.toLowerCase() ?? "bin";
      return {
        title: ref.fileName,
        format: ext,
        uploadedFileReference: ref.fileReference,
        relationType: isMain
          ? settings.docMainFileRelationType
          : settings.docAttachmentRelationType,
      };
    });

    const allAdditionalFields = ctx.additionalFields ?? [];

    // Step 5: Build document contacts
    // – søker → mottaker (roleApplicantRecipient)
    // – deltakere → kopimottakere (roleCopyRecipient), excluding søker to avoid duplicates
    const docContacts: Array<{ role: string; recno: number }> = [];
    if (ctx.applicantRecno) {
      docContacts.push({
        role: settings.roleApplicantRecipient,
        recno: ctx.applicantRecno,
      });
    }
    for (const p of ctx.participants ?? []) {
      if (p.recno === ctx.applicantRecno) continue; // already added as mottaker
      docContacts.push({ role: settings.roleCopyRecipient, recno: p.recno });
    }

    // Step 6: Create document
    const sifDocument = await createInspectionDocumentInSif({
      caseNumber: sifCase.caseNumber,
      title,
      archive: settings.docArchive,
      category: settings.docCategory,
      status: settings.docStatus,
      responsiblePersonRecno:
        settings.responsiblePersonRecno > 0
          ? settings.responsiblePersonRecno
          : undefined,
      files: docFiles,
      contacts: docContacts.length > 0 ? docContacts : undefined,
      additionalFields: allAdditionalFields.length > 0 ? allAdditionalFields : undefined,
      documentDate: ctx.inspectionDate,
      accessCode: settings.docAccessCode || undefined,
      correlationId,
    });

    console.info("[SIF] Archival complete", {
      correlationId,
      inspectionId: ctx.inspectionId,
      documentRecno: sifDocument.recno,
      documentNumber: sifDocument.documentNumber,
    });

    return {
      inspection_id: ctx.inspectionId,
      status: "success",
      sif_case_number: sifCase.caseNumber,
      sif_case_recno: sifCase.recno,
      sif_document_number: sifDocument.documentNumber,
      sif_document_recno: sifDocument.recno,
      sif_document_url: sifDocument.url,
      request_payload_json: requestPayload,
      response_payload_json: { sifCase, sifDocument },
      archived_at: new Date().toISOString(),
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);
    const errorCode =
      err instanceof SifError ? err.code : "UNKNOWN_ERROR";

    console.error("[SIF] Archival failed", {
      correlationId,
      inspectionId: ctx.inspectionId,
      errorCode,
      errorMessage,
    });

    return {
      inspection_id: ctx.inspectionId,
      status: "failed",
      sif_case_number: ctx.caseNumber,
      request_payload_json: requestPayload,
      error_message: `[${errorCode}] ${errorMessage}`,
    };
  }
}
