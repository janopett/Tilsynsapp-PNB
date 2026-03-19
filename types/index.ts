// ============================================================
// Core domain types for Tilsynsapp-PNB
// ============================================================

export type InspectionStatus = "draft" | "in_progress" | "completed" | "archived";
export type CheckpointStatus = "not_checked" | "ok" | "deviation";
export type ArchivalStatus = "pending" | "success" | "failed";
export type SifAuthMode = "authkey" | "combined_daemon";

// ============================================================
// Measure (tiltakstype) types
// ============================================================

export type MeasureTypeId =
  | "garasje_carport"
  | "tilbygg"
  | "paabygg"
  | "enebolig"
  | "bruksendring"
  | "terrasse_balkong"
  | "stoettemur"
  | "riving";

export interface MeasureType {
  id: MeasureTypeId;
  name: string;
  description: string;
  icon?: string;
}

// ============================================================
// Tags / filter properties (egenskaper)
// ============================================================

export type PropertyTag =
  | "soeknadspliktig"
  | "naer_nabogrense"
  | "inneholder_vaatrom"
  | "har_brannskille"
  | "har_terrengendring"
  | "har_elektrisk_arbeid"
  | "har_va_overvann"
  | "krever_tilgjengelighet"
  | "har_ansvarlige_foretak"
  | "har_dispensasjon";

export interface PropertyQuestion {
  tag: PropertyTag;
  label: string;
  description?: string;
}

// ============================================================
// Checkpoint definition (master data)
// ============================================================

export type CheckpointCategory =
  | "formelle_forhold"
  | "plassering"
  | "utnyttelse_stoerrelse"
  | "konstruksjon"
  | "brann"
  | "fukt_overvann"
  | "terreng"
  | "teknisk"
  | "bruk_funksjon"
  | "dokumentasjon_ferdigattest";

export type CheckpointSeverity = "info" | "warning" | "critical";

export interface CheckpointDefinition {
  id: string;
  title: string;
  category: CheckpointCategory;
  description: string;
  /** Tiltakstyper this checkpoint applies to */
  applies_to: MeasureTypeId[];
  /** All tags must match for this checkpoint to be visible */
  required_tags: PropertyTag[];
  severity: CheckpointSeverity;
  legal_reference?: string;
}

// ============================================================
// Inspection (tilsyn)
// ============================================================

export interface Inspection {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;

  // Case metadata
  case_number?: string;       // Saksnummer
  case_title?: string;        // Sakstittel fra PNB
  property_address: string;   // Eiendomsadresse
  gnr?: string;               // Gårdsnummer
  bnr?: string;               // Bruksnummer
  snr?: string;               // Seksjonsnummer
  fnr?: string;               // Festenummer
  applicant_name?: string;    // Søkers navn
  applicant_recno?: number | null; // Søkers recno i 360° (settes når søker velges fra kontaktlisten)
  inspector_name?: string;    // Tilsynsmannens navn
  inspection_date: string;    // Dato for tilsyn (ISO date string)
  notes?: string;             // Generelle merknader

  // Participants (kontakter som deltar på tilsynet)
  participants: SifContact[];

  // Estates (eiendommer knyttet til tilsynet)
  estates: SifEstate[];

  // Coordinates (kart)
  latitude?: number | null;
  longitude?: number | null;

  // Classification
  measure_type_id: MeasureTypeId;
  selected_tags: PropertyTag[];

  status: InspectionStatus;
}

export interface InspectionCreate {
  property_address: string;
  case_number?: string;
  case_title?: string;
  gnr?: string;
  bnr?: string;
  snr?: string;
  fnr?: string;
  applicant_name?: string;
  applicant_recno?: number;
  inspector_name?: string;
  inspection_date: string;
  notes?: string;
  measure_type_id: MeasureTypeId;
  selected_tags: PropertyTag[];
  participants?: SifContact[];
  estates?: SifEstate[];
  latitude?: number;
  longitude?: number;
}

// ============================================================
// Inspection answers (svar per sjekkpunkt)
// ============================================================

export interface InspectionAnswer {
  id: string;
  inspection_id: string;
  checkpoint_definition_id: string;
  status: CheckpointStatus;
  comment?: string;
  responsible_contact_recno?: number | null;
  responsible_contact_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Attachments / Photos
// ============================================================

export interface Attachment {
  id: string;
  inspection_id: string;
  checkpoint_definition_id?: string;
  file_name: string;
  file_path: string;        // Storage path in Supabase
  file_type: string;        // MIME type
  file_size_bytes: number;
  storage_url?: string;     // Public URL if applicable
  uploaded_at: string;
  // SIF sync fields
  sif_uploaded_file_reference?: string;
  sif_upload_status?: "pending" | "uploaded" | "failed";
}

// ============================================================
// SIF Archival
// ============================================================

export interface InspectionArchival {
  id: string;
  inspection_id: string;
  status: ArchivalStatus;
  sif_case_number?: string;
  sif_case_recno?: number;
  sif_document_number?: string;
  sif_document_recno?: number;
  sif_document_url?: string;
  request_payload_json?: Record<string, unknown>;
  response_payload_json?: Record<string, unknown>;
  error_message?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Composite types for UI
// ============================================================

export interface CheckpointWithAnswer {
  definition: CheckpointDefinition;
  answer?: InspectionAnswer;
}

export interface InspectionWithAnswers extends Inspection {
  answers: InspectionAnswer[];
  attachments: Attachment[];
  archival?: InspectionArchival;
}

export interface InspectionSummary {
  total: number;
  ok: number;
  deviations: number;
  not_checked: number;
  deviation_items: CheckpointWithAnswer[];
}

// ============================================================
// SIF API types
// ============================================================

export interface SifContact {
  recno: number;
  name: string;
  role?: string;
  roleDescription?: string;
  email?: string;
  phone?: string;
  type?: "contactPerson" | "privatePerson" | "enterprise";
}

export interface SifEstate {
  recno: number;
  address?: string;
  gnr?: string;
  bnr?: string;
  fnr?: string;
  snr?: string;
  municipality?: string;
}

export interface SifCase {
  recno: number;
  caseNumber: string;
  title: string;
  url?: string;
  uid?: string;
  uidOrigin?: string;
  raw?: unknown;
}

export interface SifDocument {
  recno: number;
  documentNumber?: string;
  title?: string;
  url?: string;
  raw?: unknown;
}

export interface SifUploadedFileReference {
  fileReference: string;
  fileName: string;
}

export interface SifVersion {
  version: string;
  buildDate?: string;
}

// ============================================================
// API request/response shapes
// ============================================================

export interface ArchiveInspectionRequest {
  inspectionId: string;
  caseNumber?: string;
  externalId?: string;
  uid?: string;
  additionalFields?: Array<{ name: string; value: string }>;
}

export interface ArchiveInspectionResponse {
  success: boolean;
  archival?: InspectionArchival;
  error?: string;
}
