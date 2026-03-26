// ============================================================
// SIF Archival Orchestrator
// Coordinates: case lookup → file upload → create document → persist
// ============================================================

import { v4 as uuidv4 } from "uuid";
import { findCaseInSif } from "./case-service";
import { synchronizeContactPerson } from "./contact-service";
import { uploadFilesToSif } from "./file-service";
import { createInspectionDocumentInSif, updateInspectionDocumentInSif, dispatchDocumentsInSif } from "./document-service";
import { loadSifSettingsWithEnvFallback } from "./settings";
import { buildDocumentTitle } from "@/config/sif-mapping";
import {
  SifError,
  SifCaseNotFoundError,
  SifMultipleCasesFoundError,
  SifUploadError,
  SifCreateDocumentError,
} from "./errors";
import type { SifCaseResult } from "./types";
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
  /**
   * Eksterne deltakere (not part of PNB case).
   * Each participant is synced into 360° via SynchronizeContactPerson and added as kopimottaker.
   * Falls back to AdditionalFields note if sync fails.
   */
  externalParticipants?: Array<{
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    role?: string;
    company?: string;
    companyRecno?: number;
  }>;
  additionalFields?: Array<{ name: string; value: string }>;
  /** Recno of the selected SIF stage. Will be sent via AdditionalListFields on CreateDocument. */
  sifStageRecno?: number;
  /**
   * If set, update this existing document instead of creating a new one.
   * DocumentNumber is used as the identifier for UpdateDocument in SIF.
   */
  existingDocumentNumber?: string;
  /**
   * Pre-fetched SIF case (skips findCaseInSif when provided).
   * Set this when the case was looked up in parallel before archival started.
   */
  prefetchedCase?: import("@/types").SifCase;
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
    // Step 1: Load settings + find case in parallel (independent calls).
    // If the case was pre-fetched in route.ts (parallel with DB + PDF), skip the lookup.
    const [settings, sifCase] = await Promise.all([
      loadSifSettingsWithEnvFallback(),
      ctx.prefetchedCase
        ? Promise.resolve(ctx.prefetchedCase)
        : findCaseInSif({
            caseNumber: ctx.caseNumber,
            externalId: ctx.externalId,
            uid: ctx.uid,
            correlationId,
          }),
    ]);

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

    // Upload files and sync external participants in parallel (independent operations)
    const extParticipants = ctx.externalParticipants ?? [];
    const [uploadedRefs, extSyncResults] = await Promise.all([
      uploadFilesToSif(filesToUpload),
      Promise.allSettled(
        extParticipants.map((ep) =>
          synchronizeContactPerson({
            externalId: ep.id,
            firstName: ep.firstName,
            lastName: ep.lastName,
            enterprise: ep.companyRecno ? `recno:${ep.companyRecno}` : ep.company,
            title: ep.role,
          })
        )
      ),
    ]);

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

    // Step 5: Build document contacts
    // – søker → mottaker (roleApplicantRecipient)
    // – deltakere → kopimottakere (roleCopyRecipient), excluding søker to avoid duplicates
    //
    // Resolution order for applicant recno:
    //   1. Explicitly stored applicant_recno on the inspection (best)
    //   2. Name-match against inspection participants (fallback for old inspections)
    //   3. Name-match against SIF case contacts fetched with IncludeCaseContacts (last resort)
    const caseContacts = ((sifCase.raw as SifCaseResult | undefined)?.Contacts ?? []);
    const resolvedApplicantRecno =
      ctx.applicantRecno ??
      (ctx.applicantName
        ? (ctx.participants ?? []).find((p) => p.name === ctx.applicantName)?.recno
        : undefined) ??
      (ctx.applicantName
        ? caseContacts.find((c) => c.ContactName === ctx.applicantName)?.Recno
        : undefined);

    const docContacts: Array<{ role: string; recno: number }> = [];
    if (resolvedApplicantRecno) {
      docContacts.push({ role: settings.roleApplicantRecipient, recno: resolvedApplicantRecno });
    }
    for (const p of ctx.participants ?? []) {
      if (p.recno === resolvedApplicantRecno) continue; // already added as mottaker
      docContacts.push({ role: settings.roleCopyRecipient, recno: p.recno });
    }
    const extNoteFields: Array<{ name: string; value: string }> = [];
    for (let i = 0; i < extParticipants.length; i++) {
      const r = extSyncResults[i];
      const ep = extParticipants[i];
      if (r.status === "fulfilled") {
        docContacts.push({ role: settings.roleCopyRecipient, recno: r.value });
      } else {
        console.warn("[SIF] SynchronizeContactPerson failed, noting in AdditionalFields", {
          name: ep.name,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
        extNoteFields.push({
          name: "EksternDeltaker",
          value: [ep.name, ep.role, ep.company].filter(Boolean).join(" – "),
        });
      }
    }

    const allAdditionalFields = [...(ctx.additionalFields ?? []), ...extNoteFields];

    // Resolve stage title from case stages (already fetched with IncludeStages: true)
    let stageName: string | undefined;
    if (ctx.sifStageRecno) {
      const caseStages = ((sifCase.raw as SifCaseResult | undefined)?.Stages ?? []);
      stageName = caseStages.find((s) => s.Recno === ctx.sifStageRecno)?.Title;
    }

    // Step 6: Create or update document.
    // UpdateDocument: contacts are passed but stageRecno (AdditionalListFields) is excluded —
    // AdditionalListFields.Value as a number causes "Incorrect JSON format" in UpdateDocument.
    const sifDocument = ctx.existingDocumentNumber
      ? await updateInspectionDocumentInSif({
          documentNumber: ctx.existingDocumentNumber,
          files: docFiles,
          contacts: docContacts.length > 0 ? docContacts : undefined,
          correlationId,
        })
      : await createInspectionDocumentInSif({
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
          stageRecno: ctx.sifStageRecno,
          stageName,
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

    // Step 7: Auto-dispatch if configured
    let dispatched: boolean | undefined;
    let dispatchError: string | undefined;

    if (settings.autoDispatch && (sifDocument.recno || sifDocument.documentNumber)) {
      try {
        const docIdentifier = sifDocument.recno
          ? { recno: sifDocument.recno }
          : { documentNumber: sifDocument.documentNumber };
        const dispatchResult = await dispatchDocumentsInSif(
          [docIdentifier],
          correlationId
        );
        dispatched = dispatchResult.Successful;
        if (!dispatchResult.Successful) {
          dispatchError =
            dispatchResult.ErrorMessage ??
            dispatchResult.ErrorDetails ??
            "DispatchDocuments feilet";
        }
      } catch (dispatchErr) {
        dispatched = false;
        dispatchError =
          dispatchErr instanceof Error
            ? dispatchErr.message
            : String(dispatchErr);
        console.error("[SIF] DispatchDocuments failed", {
          correlationId,
          dispatchError,
        });
      }
    }

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
      dispatched,
      dispatch_error: dispatchError,
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
