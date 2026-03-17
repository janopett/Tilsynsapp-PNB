import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { archiveInspectionToSif } from "@/lib/sif/archival";
import { generateInspectionPdf, buildPdfFileName } from "@/lib/pdf/generate";
import type { InspectionWithAnswers, ArchiveInspectionResponse } from "@/types";

const ArchiveRequestSchema = z.object({
  inspectionId: z.string().uuid(),
  caseNumber: z.string().optional(),
  externalId: z.string().optional(),
  uid: z.string().optional(),
  additionalFields: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const serviceClient = createServiceClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" } satisfies ArchiveInspectionResponse, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ArchiveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid request" } satisfies ArchiveInspectionResponse, { status: 400 });
  }

  const { inspectionId, caseNumber, externalId, uid, additionalFields } = parsed.data;

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

  // Generate PDF
  const pdfBuffer = generateInspectionPdf(inspection);
  const pdfFileName = buildPdfFileName(inspection);

  // Download attachment files from Supabase Storage
  const attachmentFiles: Array<{ fileName: string; fileData: Buffer; mimeType: string }> = [];
  for (const att of inspection.attachments) {
    try {
      const { data: fileData } = await supabase.storage
        .from("inspection-attachments")
        .download(att.file_path);
      if (fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        attachmentFiles.push({
          fileName: att.file_name,
          fileData: buffer,
          mimeType: att.file_type,
        });
      }
    } catch (err) {
      console.warn(`Could not download attachment ${att.file_name}:`, err);
    }
  }

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

  // Run archival
  const result = await archiveInspectionToSif({
    inspectionId,
    caseNumber,
    externalId,
    uid,
    propertyAddress: inspection.property_address,
    inspectionDate: inspection.inspection_date,
    pdfBuffer,
    pdfFileName,
    attachments: attachmentFiles,
    additionalFields,
  });

  // Update archival record
  const archivalId = archival?.id;
  if (archivalId) {
    await serviceClient
      .from("inspection_archivals")
      .update(result)
      .eq("id", archivalId);
  } else {
    await serviceClient.from("inspection_archivals").insert(result);
  }

  // If successful, update inspection status to "archived"
  if (result.status === "success") {
    await supabase
      .from("inspections")
      .update({ status: "archived" })
      .eq("id", inspectionId);
  }

  // Fetch updated archival record
  const { data: finalArchival } = await serviceClient
    .from("inspection_archivals")
    .select("*")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const response: ArchiveInspectionResponse = {
    success: result.status === "success",
    archival: finalArchival ?? undefined,
    error: result.status === "failed" ? result.error_message ?? "Archival failed" : undefined,
  };

  return NextResponse.json(response, {
    status: result.status === "success" ? 200 : 500,
  });
}
