// ============================================================
// Dry-run preview endpoint — returns the exact JSON payload
// that would be sent to SIF without actually calling it.
// Useful for debugging contact mapping without creating documents.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/api-auth";
import { loadSifSettingsWithEnvFallback } from "@/lib/sif/settings";
import { buildDocumentTitle } from "@/config/sif-mapping";
import { MEASURE_TYPES } from "@/data/seed/measure-types";
import type { InspectionWithAnswers } from "@/types";

const PreviewRequestSchema = z.object({
  inspectionId: z.string().uuid(),
  caseNumber: z.string().optional(),
  additionalFields: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const { user, supabase } = auth;

  const body = await req.json().catch(() => null);
  const parsed = PreviewRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { inspectionId, caseNumber, additionalFields } = parsed.data;

  const [inspRes, answersRes] = await Promise.all([
    supabase.from("inspections").select("*").eq("id", inspectionId).eq("user_id", user.id).single(),
    supabase.from("inspection_answers").select("*").eq("inspection_id", inspectionId),
  ]);

  if (inspRes.error || !inspRes.data) {
    return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
  }

  const inspection: InspectionWithAnswers = {
    ...inspRes.data,
    answers: answersRes.data ?? [],
    attachments: [],
  };

  const settings = await loadSifSettingsWithEnvFallback();

  const measureTypeName = MEASURE_TYPES.find((m) => m.id === inspection.measure_type_id)?.name;

  const title = buildDocumentTitle(settings.docTitleTemplate, {
    caseTitle: inspection.case_title ?? "",
    date: inspection.inspection_date ?? "",
    propertyAddress: inspection.property_address ?? "",
    inspectorName: inspection.inspector_name ?? "",
    applicantName: inspection.applicant_name ?? "",
    measureType: measureTypeName ?? "",
  });

  // Build contacts (same logic as archival.ts)
  const participants: Array<{ recno: number; name: string }> = (
    inspection.participants ?? []
  ).map((p) => ({ recno: p.recno, name: p.name }));

  const applicantRecno = inspection.applicant_recno ?? undefined;

  // Fallback: derive applicant recno from participants by name if not explicitly stored.
  // Handles inspections created before applicant_recno was persisted.
  const resolvedApplicantRecno =
    applicantRecno ??
    (inspection.applicant_name
      ? participants.find((p) => p.name === inspection.applicant_name)?.recno
      : undefined);

  const docContacts: Array<{ Role: string; ExternalId: string | undefined }> = [];
  if (resolvedApplicantRecno) {
    docContacts.push({
      Role: settings.roleApplicantRecipient,
      ExternalId: `recno:${resolvedApplicantRecno}`,
    });
  }
  for (const p of participants) {
    if (p.recno === resolvedApplicantRecno) continue;
    docContacts.push({
      Role: settings.roleCopyRecipient,
      ExternalId: `recno:${p.recno}`,
    });
  }
  // External participants with companyRecno → copy recipients
  const externalParticipants = (inspection.external_participants ?? []) as Array<{
    id: string; name: string; role?: string; company?: string; companyRecno?: number;
  }>;
  for (const ep of externalParticipants) {
    if (ep.companyRecno) {
      docContacts.push({ Role: settings.roleCopyRecipient, ExternalId: `recno:${ep.companyRecno}` });
    }
  }
  const extNoteFields = externalParticipants
    .filter((ep) => !ep.companyRecno)
    .map((ep) => ({ Name: "EksternDeltaker", Value: [ep.name, ep.role, ep.company].filter(Boolean).join(" – ") }));

  const payload = {
    Title: title,
    CaseNumber: caseNumber ?? inspection.case_number ?? "(ikke satt)",
    Archive: settings.docArchive,
    Category: settings.docCategory,
    Status: settings.docStatus,
    DocumentDate: inspection.inspection_date ?? new Date().toISOString().slice(0, 10),
    ...(settings.docAccessCode ? { AccessCode: settings.docAccessCode } : {}),
    ...(settings.responsiblePersonRecno > 0
      ? { ResponsiblePersonRecno: settings.responsiblePersonRecno }
      : {}),
    Contacts: docContacts,
    Files: [
      { Title: "(PDF-rapport)", Format: "pdf", RelationType: settings.docMainFileRelationType },
    ],
    ...([...(additionalFields?.map((f) => ({ Name: f.name, Value: f.value })) ?? []), ...extNoteFields].length
      ? { AdditionalFields: [...(additionalFields?.map((f) => ({ Name: f.name, Value: f.value })) ?? []), ...extNoteFields] }
      : {}),
  };

  return NextResponse.json({
    _info: {
      note: "Dette er en dry-run preview — ingen kall til SIF er gjort.",
      inspectionId,
      applicantName: inspection.applicant_name,
      applicantRecno,
      resolvedApplicantRecno,
      participants,
      roleApplicantRecipient: settings.roleApplicantRecipient,
      roleCopyRecipient: settings.roleCopyRecipient,
    },
    sifPayload: {
      parameter: payload,
    },
  });
}
