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
    titleTemplate: "Tilsynsrapport - {{propertyAddress}} - {{date}}",
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

/**
 * Build a document title from the template and inspection metadata.
 */
export function buildDocumentTitle(
  template: string,
  vars: {
    propertyAddress?: string;
    caseNumber?: string;
    date?: string;
  }
): string {
  const date = vars.date ?? new Date().toISOString().slice(0, 10);
  return template
    .replace("{{propertyAddress}}", vars.propertyAddress ?? "")
    .replace("{{caseNumber}}", vars.caseNumber ?? "")
    .replace("{{date}}", date)
    .trim();
}
