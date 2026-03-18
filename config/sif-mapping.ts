// ============================================================
// SIF Mapping Configuration
// TODO: Fill in customer-specific code values before deployment.
// All values can be either code string or "recno:XXXXX".
//
// Find actual values using:
//   SupportService/GetCodeTableRows (for code tables)
//   or check the 360° admin portal.
// ============================================================

export interface SifDocumentMapping {
  /** Document archive. E.g. "Generelt dokument" or "recno:17" */
  archive: string;
  /** Document category. E.g. "Internt notat uten oppfølging" or "recno:111" */
  category: string;
  /** Document status (journal status). E.g. "J" (journalført) or "recno:6" */
  status: string;
  /** Title template with placeholders: {{propertyAddress}}, {{caseNumber}}, {{date}} */
  titleTemplate: string;
  /** Relation type for main file. H = hoveddokument */
  mainFileRelationType: string;
  /** Relation type for attachment files. V = vedlegg */
  attachmentRelationType: string;
}

export interface SifContactRoleMapping {
  /** Contact role for the municipality (sender/avsender) */
  municipalitySenderRole: string;
  /** Contact role for the applicant (mottaker) */
  applicantRecipientRole: string;
}

export interface SifDefaultsMapping {
  /** Recno of the responsible person (ansvarlig saksbehandler). 0 = not set */
  responsiblePersonRecno: number;
  /** Additional fields to always include on archived documents */
  standardAdditionalFields: Array<{ name: string; value: string }>;
}

export interface SifMappingConfig {
  inspectionReport: SifDocumentMapping;
  contactRoles: SifContactRoleMapping;
  defaults: SifDefaultsMapping;
}

// ============================================================
// TODO: Replace these placeholder values with your customer's
// actual code values from the 360°/Plan & Build installation.
// ============================================================
export const sifMapping: SifMappingConfig = {
  inspectionReport: {
    // TODO: Replace with correct archive for tilsynsrapporter
    archive: "recno:2",            // Default: "Saksdokument"
    // TODO: Replace with correct category recno
    category: "recno:111",         // e.g. "Internt notat uten oppfølging"
    // TODO: Replace with correct status recno (J = Journalført)
    status: "J",
    titleTemplate: "{{title}} - Tilsynsrapport - {{date}}",
    mainFileRelationType: "H",
    attachmentRelationType: "V",
  },
  contactRoles: {
    // TODO: Replace with correct role codes from 360° code table
    municipalitySenderRole: "AV",   // Avsender
    applicantRecipientRole: "EM",   // Ekstern mottaker
  },
  defaults: {
    // TODO: Set to 0 or the correct recno of the service user / default responsible
    responsiblePersonRecno: 0,
    standardAdditionalFields: [
      // TODO: Add any required additional fields
      // { name: "IntegrasjonKilde", value: "Tilsynsapp" },
    ],
  },
};

export interface TitleTemplateVars {
  propertyAddress?: string;
  caseNumber?: string;
  caseTitle?: string;
  date?: string;
  inspectorName?: string;
  applicantName?: string;
  gnrBnr?: string;
  measureType?: string;
  year?: string;
  inspectionId?: string;
}

/**
 * Build a document title from the template and inspection metadata.
 * Supports: {{propertyAddress}}, {{caseNumber}}, {{caseTitle}},
 *           {{date}}, {{inspectorName}}, {{applicantName}},
 *           {{gnrBnr}}, {{measureType}}, {{year}}, {{inspectionId}}
 */
export function buildDocumentTitle(
  template: string,
  vars: TitleTemplateVars
): string {
  const rawDate = vars.date ?? new Date().toISOString().slice(0, 10);
  // Format date as DD.MM.ÅÅÅÅ for Norwegian display
  const [yyyy, mm, dd] = rawDate.split("-");
  const formattedDate = dd && mm && yyyy ? `${dd}.${mm}.${yyyy}` : rawDate;

  return template
    .replace(/\{\{propertyAddress\}\}/g, vars.propertyAddress ?? "")
    .replace(/\{\{caseNumber\}\}/g, vars.caseNumber ?? "")
    .replace(/\{\{title\}\}/g, vars.caseTitle ?? "")          // preferred alias
    .replace(/\{\{caseTitle\}\}/g, vars.caseTitle ?? "")      // backward compat
    .replace(/\{\{date\}\}/g, formattedDate)
    .replace(/\{\{inspectorName\}\}/g, vars.inspectorName ?? "")
    .replace(/\{\{applicantName\}\}/g, vars.applicantName ?? "")
    .replace(/\{\{gnrBnr\}\}/g, vars.gnrBnr ?? "")
    .replace(/\{\{measureType\}\}/g, vars.measureType ?? "")
    .replace(/\{\{year\}\}/g, vars.year ?? yyyy ?? "")
    .replace(/\{\{inspectionId\}\}/g, vars.inspectionId ?? "")
    .trim();
}
