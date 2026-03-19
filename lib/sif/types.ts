// ============================================================
// SIF API Request / Response Types
// Based on SIF APIs Documentation (Feb 2026, v6.8)
// Using SIF RPC interface only (not SOAP/REST)
// ============================================================

// RPC URL format:
// https://[customer]/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC/[Service]/[Method]

// ============================================================
// Common
// ============================================================

export interface SifAdditionalField {
  Name: string;
  Value: string;
}

export interface SifAdditionalListField {
  Name: string;
  Values: string[];
}

// ============================================================
// CaseService
// ============================================================

export interface SifGetCasesQuery {
  CaseNumber?: string;
  ExternalId?: {
    Id: string;
    Type?: string;
  };
  ImportedCaseNumber?: string;
  UID?: string;
  UIDOrigin?: string;
  Title?: string;
  MaxResults?: number;
  IncludeReferringCases?: boolean;
  IncludeCaseContacts?: boolean;
  IncludeCaseEstates?: boolean;
  IncludeStages?: boolean;
  AdditionalFields?: SifAdditionalField[];
}

export interface SifCaseContact {
  Recno: number;
  ContactName?: string;  // actual SIF field name
  Role?: string;
  RoleDescription?: string;
  Email?: string;
  Phone?: string;
}

export interface SifCaseEstate {
  Recno: string | number;
  // EstateNumber is "gnr/bnr/fnr/snr" e.g. "168/200/0/1"
  EstateNumber?: string;
  Address?: {
    StreetAddress?: string;
    ZipCode?: string;
    ZipPlace?: string;
  };
}

/** Data Contract: Stage (SIF API docs 7.4.22) */
export interface SifCaseStage {
  Recno?: number;
  Title?: string;
  StartDate?: string;
  DeadlineDate?: string;
  Notes?: string;
  CalculationDays?: number;
  StageType?: { Code?: string; Description?: string };
  StageStatus?: { Code?: string; Description?: string };
  ProlongedCaseHandlingDays?: number;
  RemainingDays?: number;
  Milestones?: unknown[];
}

export interface SifCaseResult {
  Recno: number;
  CaseNumber: string;
  Title: string;
  URL?: string;
  UID?: string;
  UIDOrigin?: string;
  Status?: {
    Code?: string;
    Description?: string;
  };
  ResponsiblePerson?: {
    Recno: number;
    Name?: string;
  };
  Contacts?: SifCaseContact[];
  CaseEstates?: SifCaseEstate[];
  Stages?: SifCaseStage[];
  AdditionalFields?: SifAdditionalField[];
}

export interface SifGetCasesResult {
  Successful: boolean;
  Cases?: SifCaseResult[];
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// CaseService - GetCase (singular, by Recno)
// ============================================================

export interface SifGetCaseQuery {
  CaseRecno: number;
  IncludeReferringCases?: boolean;
  IncludeCaseContacts?: boolean;
}

export interface SifGetCaseResult {
  Successful: boolean;
  Case?: SifCaseResult;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// CaseService - GetCaseContacts
// ============================================================

export interface SifGetCaseContactsQuery {
  CaseRecno?: number;
  CaseNumber?: string;
}

export interface SifGetCaseContactsResult {
  Successful: boolean;
  Contacts?: SifCaseContact[];
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// FileService
// ============================================================

export interface SifUploadInput {
  FileData: string; // base64-encoded binary
  FileName: string; // Must include extension, e.g. "rapport.pdf"
  FileFormat?: string; // e.g. "pdf"
  User?: string;
}

export interface SifUploadResult {
  Successful: boolean;
  FileReference?: string; // Use this in UploadedFileReference
  ErrorMessage?: string;
  ErrorDetails?: string;
}

export interface SifUploadStreamInput {
  FileData: string; // base64 for RPC
  FileName: string;
  FileFormat?: string;
  User?: string;
}

// ============================================================
// DocumentService - File item inside CreateDocument
// ============================================================

export interface SifFileInput {
  Title: string;
  Format: string;           // File extension without dot, e.g. "pdf"
  UploadedFileReference?: string; // From FileService.Upload
  VersionFormat?: string;
  RelationType?: string;    // e.g. "H" for hoveddokument
  Status?: string;          // e.g. "B"
}

// ============================================================
// DocumentService - Contact (Kontakt/sender/recipient)
// ============================================================

export interface SifDocumentContact {
  Role: string;                 // code or recno
  /**
   * Identifies the contact. Use "recno:XXXX" when you only have the 360° recno.
   * Can also be org.nr / personnummer. Prefer this over ReferenceNumber (works across domains).
   */
  ExternalId?: string;
  /** Alternative identifier — org.nr or personnummer. Falls back to "recno:XXXX" format. */
  ReferenceNumber?: string;
  IsUnofficial?: boolean;
  DispatchChannel?: string;     // e.g. "recno:1" for e-mail
}

export interface SifUnregisteredContact {
  Role: string;
  Name: string;
  Address?: string;
  ZipCode?: string;
  ZipPlace?: string;
  Email?: string;
}

// ============================================================
// DocumentService.CreateDocument
// ============================================================

export interface SifCreateDocumentInput {
  Title: string;
  Archive?: string;             // code or recno, defaults to "Saksdokument"
  Category?: string;            // code or recno, e.g. "recno:111"
  Status?: string;              // code or recno, e.g. "J" or "recno:6"
  CaseNumber?: string;          // Preferred: link by case number
  CaseExternalId?: {
    Id: string;
    Type?: string;
  };
  DocumentDate?: string;        // ISO date string
  JournalDate?: string;
  UnofficialTitle?: string;
  ResponsiblePersonRecno?: number;
  ResponsiblePersonEmail?: string;
  ResponsiblePersonUserId?: string;
  ResponsibleEnterpriseRecno?: number;
  Contacts?: SifDocumentContact[];
  UnregisteredContacts?: SifUnregisteredContact[];
  Files?: SifFileInput[];
  AdditionalFields?: SifAdditionalField[];
  Keywords?: string[];
  Notes?: string;
  AccessCode?: string;
  ExternalId?: {
    Id: string;
    Type?: string;
  };
}

export interface SifCreateDocumentResult {
  Successful: boolean;
  Recno?: number;
  DocumentNumber?: string;
  UID?: string;
  UIDOrigin?: string;
  URL?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// DocumentService - DispatchDocuments
// ============================================================

export interface SifDispatchDocumentItem {
  /** Use either Recno OR DocumentNumber */
  Recno?: number;
  DocumentNumber?: string;
}

export interface SifDispatchDocumentsInput {
  Documents: SifDispatchDocumentItem[];
}

export interface SifDispatchDocumentsResult {
  Successful: boolean;
  ErrorMessage?: string;
  ErrorDetails?: string;
  DocumentResult?: Array<{
    Successful: boolean;
    Recno?: number;
    DocumentNumber?: string;
    ErrorMessage?: string;
    ErrorDetails?: string;
  }>;
}

// ============================================================
// ContactService - GetEnterprises
// ============================================================

export interface SifGetEnterpriseQuery {
  Name?: string;
  Recno?: number;
  ExternalID?: string;
  /** Organisation number (orgnr) */
  EnterpriseNumber?: string;
  MaxRows?: number;
  Active?: boolean;
  IncludeCustomFields?: boolean;
}

export interface SifEnterpriseResult {
  Recno: number;
  Name: string;
  OrgNo?: string;
  Email?: string;
  AlternativeEmail?: string;
  Phone?: string;
  Address?: string;
  ZipCode?: string;
  ZipPlace?: string;
  ExternalID?: string;
}

export interface SifGetEnterpriseResult {
  Successful: boolean;
  Enterprises?: SifEnterpriseResult[];
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// ContactService - SynchronizeContactPerson
// ============================================================

export interface SifSynchronizeContactPersonInput {
  /** Stable external key — SIF upserts on this. Use a deterministic ID (e.g. our UUID per participant). */
  ExternalId: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  /**
   * Enterprise identifier for the person's employer in 360°.
   * Use "recno:XXXX" when companyRecno is known, or a plain name string as fallback.
   */
  Enterprise?: string;
  PhoneNumber?: string;
  MobilePhone?: string;
  Email?: string;
  Title?: string;
  Active?: boolean;
}

export interface SifSynchronizeContactPersonResult {
  Successful: boolean;
  /** Recno of the created or updated contact person in PNB */
  Recno?: number;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// SupportService
// ============================================================

export interface SifGetVersionResult {
  Successful: boolean;
  SIFVersion?: string;
  BuildDate?: string;
  ErrorMessage?: string;
}

// ============================================================
// Internal request builder types
// ============================================================

export interface SifRpcRequest<T> {
  service: string;
  method: string;
  payload: T;
}

export interface SifAuthHeaders {
  "AuthKey"?: string;
  "Authorization"?: string;
  "ClientID"?: string;
  "Content-Type": string;
}
