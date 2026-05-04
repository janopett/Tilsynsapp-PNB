import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { archiveInspectionToSif } from "@/lib/sif/archival";
import { findCaseInSif } from "@/lib/sif/case-service";
import { generateInspectionPdf, buildPdfFileName, generateInspectionJson, buildJsonFileName, type AttachmentForPdf } from "@/lib/pdf/generate";
import { fetchStaticMapImage } from "@/lib/pdf/map-image";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import type { InspectionWithAnswers, ArchiveInspectionResponse, SifCase } from "@/types";

const ArchiveRequestSchema = z.object({
  inspectionId: z.string().uuid(),
  caseNumber: z.string().optional(),
  externalId: z.string().optional(),
  uid: z.string().optional(),
  additionalFields: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  existingDocumentNumber: z.string().min(1).optional(),
  /** Base64 JPEG data URLs keyed by checkpoint_definition_id, captured client-side. */
  checkpointMapImages: z.record(z.string(), z.string().startsWith("data:image/")).optional(),
  /** Base64 JPEG overview map with numbered pins, captured client-side. */
  overviewMapImage: z.string().startsWith("data:image/").optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user, supabase } = auth;
  const serviceClient = createServiceClient();

  const body = await req.json().catch(() => null);
  const parsed = ArchiveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" } satisfies ArchiveInspectionResponse, { status: 400 });
  }

  const { inspectionId, caseNumber, externalId, uid, additionalFields, existingDocumentNumber, checkpointMapImages, overviewMapImage } = parsed.data;

  // Start SIF case lookup in parallel with DB queries — findCaseInSif only needs the case number
  // from the request body, not any DB data, so it can run immediately. On failure we fall back to
  // null and let archiveInspectionToSif handle the error (which records it in the DB).
  const earlyLookupPromise: Promise<SifCase | null> =
    caseNumber || externalId || uid
      ? findCaseInSif({ caseNumber, externalId, uid }).catch(() => null)
      : Promise.resolve(null);

  // Load inspection with answers (parallel with case lookup)
  const [[inspRes, answersRes, attachRes], prefetchedCase] = await Promise.all([
    Promise.all([
      supabase.from("inspections").select("*").eq("id", inspectionId).eq("user_id", user.id).single(),
      supabase.from("inspection_answers").select("*").eq("inspection_id", inspectionId),
      supabase.from("attachments").select("*").eq("inspection_id", inspectionId),
    ]),
    earlyLookupPromise,
  ]);

  if (inspRes.error || !inspRes.data) {
    return NextResponse.json({ success: false, error: "Inspection not found" } satisfies ArchiveInspectionResponse, { status: 404 });
  }

  const inspection: InspectionWithAnswers = {
    ...inspRes.data,
    answers: answersRes.data ?? [],
    attachments: attachRes.data ?? [],
  };

  // Download attachment files and fetch static map image in parallel (independent operations)
  const [attachmentFiles, staticMapBuf] = await Promise.all([
    Promise.all(
      inspection.attachments.map(async (att) => {
        try {
          const { data: fileData } = await supabase.storage
            .from("inspection-attachments")
            .download(att.file_path);
          if (!fileData) return null;
          return {
            checkpointDefinitionId: att.checkpoint_definition_id ?? null,
            fileName: att.file_name,
            fileData: Buffer.from(await fileData.arrayBuffer()),
            mimeType: att.file_type,
          } satisfies AttachmentForPdf;
        } catch (err) {
          console.warn(`Could not download attachment ${att.file_name}:`, err);
          return null;
        }
      })
    ).then((results) => results.filter((f): f is NonNullable<typeof f> => f !== null)),
    inspection.latitude && inspection.longitude
      ? fetchStaticMapImage(inspection.latitude, inspection.longitude)
      : Promise.resolve(null),
  ]);

  const extraAttachments: Array<{ fileName: string; fileData: Buffer; mimeType: string }> = [];
  if (staticMapBuf) {
    const date = inspection.inspection_date ?? new Date().toISOString().slice(0, 10);
    extraAttachments.push({ fileName: `Kart_${date}.png`, fileData: staticMapBuf, mimeType: "image/png" });
  }

  // Sync values that don't depend on PDF generation
  const jsonBuffer = generateInspectionJson(inspection);
  const jsonFileName = buildJsonFileName(inspection);
  const measureTypeName = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id)?.name;

  // Generate PDF and insert pending archival record in parallel (independent operations)
  const [pdfBuffer, { data: archival }] = await Promise.all([
    generateInspectionPdf(inspection, attachmentFiles, checkpointMapImages, overviewMapImage),
    serviceClient
      .from("inspection_archivals")
      .insert({ inspection_id: inspectionId, status: "pending", sif_case_number: caseNumber })
      .select()
      .single(),
  ]);
  const pdfFileName = buildPdfFileName(inspection);

  // Run archival
  const result = await archiveInspectionToSif({
    inspectionId,
    caseNumber,
    externalId,
    uid,
    propertyAddress: inspection.property_address,
    inspectionDate: inspection.inspection_date,
    caseTitle: inspection.case_title ?? undefined,
    inspectorName: inspection.inspector_name ?? undefined,
    applicantName: inspection.applicant_name ?? undefined,
    applicantRecno: inspection.applicant_recno ?? undefined,
    participants: (inspection.participants ?? []).map((p) => ({
      recno: p.recno,
      name: p.name,
    })),
    externalParticipants: (inspection.external_participants ?? []).map((ep) => ({
      id: ep.id,
      name: ep.name,
      firstName: ep.firstName,
      lastName: ep.lastName,
      role: ep.role,
      company: ep.company,
      companyRecno: ep.companyRecno,
    })),
    gnr: inspection.gnr ?? undefined,
    bnr: inspection.bnr ?? undefined,
    measureTypeName,
    pdfBuffer,
    pdfFileName,
    jsonBuffer,
    jsonFileName,
    attachments: [...attachmentFiles, ...extraAttachments],
    additionalFields,
    sifStageRecno: inspection.sif_stage_recno ?? undefined,
    existingDocumentNumber,
    prefetchedCase: prefetchedCase ?? undefined,
  });

  // Update archival record and (if successful) inspection status in parallel.
  // Use .select().single() on the update to avoid a separate re-fetch.
  const archivalId = archival?.id;
  const [archivalUpdateRes] = await Promise.all([
    archivalId
      ? serviceClient.from("inspection_archivals").update(result).eq("id", archivalId).select().single()
      : serviceClient.from("inspection_archivals").insert(result).select().single(),
    result.status === "success"
      ? supabase.from("inspections").update({ status: "archived" }).eq("id", inspectionId)
      : Promise.resolve(),
  ]);

  const finalArchival = archivalUpdateRes.data;

  const response: ArchiveInspectionResponse = {
    success: result.status === "success",
    archival: finalArchival ?? undefined,
    error: result.status === "failed" ? result.error_message ?? "Archival failed" : undefined,
  };

  return NextResponse.json(response, {
    status: result.status === "success" ? 200 : 500,
  });
}
