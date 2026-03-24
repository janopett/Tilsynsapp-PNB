import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { archiveInspectionToSif } from "@/lib/sif/archival";
import { generateInspectionPdf, buildPdfFileName, generateInspectionJson, buildJsonFileName, type AttachmentForPdf } from "@/lib/pdf/generate";
import { fetchStaticMapImage } from "@/lib/pdf/map-image";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import type { InspectionWithAnswers, ArchiveInspectionResponse } from "@/types";

const ArchiveRequestSchema = z.object({
  inspectionId: z.string().uuid(),
  caseNumber: z.string().optional(),
  externalId: z.string().optional(),
  uid: z.string().optional(),
  additionalFields: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  existingDocumentRecno: z.number().int().positive().optional(),
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

  const { inspectionId, caseNumber, externalId, uid, additionalFields, existingDocumentRecno } = parsed.data;

  // Load inspection with answers
  const [inspRes, answersRes, attachRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", inspectionId).eq("user_id", user.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", inspectionId),
    supabase.from("attachments").select("*").eq("inspection_id", inspectionId),
  ]);

  if (inspRes.error || !inspRes.data) {
    return NextResponse.json({ success: false, error: "Inspection not found" } satisfies ArchiveInspectionResponse, { status: 404 });
  }

  const inspection: InspectionWithAnswers = {
    ...inspRes.data,
    answers: answersRes.data ?? [],
    attachments: attachRes.data ?? [],
  };

  // Download attachment files from Supabase Storage before PDF generation
  const attachmentFiles = (
    await Promise.all(
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
    )
  ).filter((f): f is NonNullable<typeof f> => f !== null);

  // Generate map image if inspection has main coordinates
  const extraAttachments: Array<{ fileName: string; fileData: Buffer; mimeType: string }> = [];
  if (inspection.latitude && inspection.longitude) {
    const mapBuf = await fetchStaticMapImage(inspection.latitude, inspection.longitude);
    if (mapBuf) {
      const date = inspection.inspection_date ?? new Date().toISOString().slice(0, 10);
      extraAttachments.push({
        fileName: `Kart_${date}.png`,
        fileData: mapBuf,
        mimeType: "image/png",
      });
    }
  }

  // Generate PDF (async — embeds images inline, merges PDF attachments)
  const pdfBuffer = await generateInspectionPdf(inspection, attachmentFiles);
  const pdfFileName = buildPdfFileName(inspection);
  const jsonBuffer = generateInspectionJson(inspection);
  const jsonFileName = buildJsonFileName(inspection);

  // Persist initial "pending" archival record
  const { data: archival } = await serviceClient
    .from("inspection_archivals")
    .insert({
      inspection_id: inspectionId,
      status: "pending",
      sif_case_number: caseNumber,
    })
    .select()
    .single();

  const measureTypeName =
    MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id)?.name;

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
    existingDocumentRecno,
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
