// ============================================================
// SIF API Request / Response Types
// Source: https://demo-eb.public360online.com/Biz/v2/api/swagger/SI.Data.RPC
// Services: CaseService, ContactService, DocumentService, EstateService,
//           FileService, SearchService, SupportService
// RPC URL: https://[customer]/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC/[Service]/[Method]
// ============================================================

// ============================================================
// Shared building blocks
// ============================================================

/** Shared address structure used across ContactService, EstateService */
export interface SifAddress {
  StreetAddress?: string;
  State?: string;
  ZipCode?: string;
  ZipPlace?: string;
  Country?: string;
  County?: string;
  Area?: string;
}

/** External ID object used across all services */
export interface SifExternalId {
  Id: string;
  Type?: string;
  ExternalName?: string;
}

/** Additional field for filtering/setting scalar values */
export interface SifAdditionalField {
  Name: string;
  Value: string;
  OperatorType?: { Value: string };
}

/** Additional list field for lookup/relation values (e.g. stage linking) */
export interface SifAdditionalListField {
  Name: string;
  Value: unknown;
}

/** Archive code entry */
export interface SifArchiveCode {
  ArchiveCode: string;
  ArchiveType?: string;
  Sort?: number;
  IsManualText?: boolean;
}

/** Permission entry used in CreateCase / CreateDocument */
export interface SifPermission {
  AccessGroup?: string;
  ContactExternalId?: string;
  AccessLevel?: "Read" | "Insert" | "Edit" | "Delete";
  Grant?: boolean;
  ViewFile?: boolean;
  InsertFile?: boolean;
  ModifyFile?: boolean;
  InsertRev?: boolean;
  ModifyRev?: boolean;
  InsertDoc?: boolean;
  Reference?: string;
}

// ============================================================
// CaseService — GetCases
// ============================================================

export interface SifGetCasesQuery {
  ADContextUser?: string;
  Recno?: number;
  ContactReferenceNumber?: string;
  CaseNumber?: string;
  ExternalId?: SifExternalId;
  ImportedCaseNumber?: string;
  UID?: string;
  UIDOrigin?: string;
  Title?: string;
  UnofficialTitle?: string;
  /** Swagger field name: MaxReturnedCases (NOT MaxResults) */
  MaxReturnedCases?: number;
  ArchiveCode?: string;
  ArchiveCodes?: string[];
  ProjectNumber?: string;
  CategoryCode?: string;
  CaseType?: string;
  SubArchive?: string;
  IncludeReferringCases?: boolean;
  IncludeReferringDocuments?: boolean;
  IncludeCaseContacts?: boolean;
  IncludeCaseEstates?: boolean;
  IncludeAccessMatrixRowPermissions?: boolean;
  IncludeCustomFields?: boolean;
  IncludeDocuments?: boolean;
  IncludeFiles?: boolean;
  IncludeProgressPlan?: boolean;
  IncludeSubjectSpecificMetaData?: boolean;
  IncludeRemarks?: boolean;
  IncludeKeywords?: boolean;
  IncludeMilestones?: boolean;
  IncludeStages?: boolean;
  IncludeUnregisteredDocuments?: boolean;
  OnlyPublicInfo?: boolean;
  SortCriterion?: "RecnoDescending" | "RecnoAscending";
  Page?: number;
  LastDate?: string;
  ContactExternalId?: string;
  ContactRecnos?: number[];
  PropertyNumber?: string;
  ProgressPlanId?: string;
  AdditionalFields?: SifAdditionalField[];
  AdditionalListFields?: SifAdditionalListField[];
  AdditionalRelations?: Array<{
    Name: string;
    FieldCriteria?: unknown;
    FieldListCriteria?: unknown;
  }>;
  DateCriteria?: Array<{
    DateName: string;
    Operator: string;
    DateValue: string;
  }>;
  MyCasesConfig?: Array<{
    CaseType?: string;
    CaseContactRoles?: unknown;
  }>;
}

export interface SifCaseContact {
  Recno: number;
  ContactName?: string;
  Role?: string;
  RoleDescription?: string;
  Email?: string;
  Phone?: string;
}

export interface SifCaseEstate {
  Recno: string | number;
  EstateNumber?: string;
  Address?: SifAddress;
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

export interface SifResponsibleEntity {
  Recno?: number;
  Name?: string;
  Email?: string;
  UserId?: string;
  ExternalId?: string;
  Referencenumber?: string;
  Url?: string;
  Domain?: number;
}

export interface SifCaseResult {
  Recno: number;
  CaseNumber: string;
  ImportedCaseNumber?: string;
  ExternalId?: SifExternalId;
  Title: string;
  UnofficialTitle?: string;
  /** Plain status string as returned by API (e.g. "Under behandling") */
  Status?: string;
  StatusRecno?: string;
  Date?: string;
  CreatedDate?: string;
  LastChangedDate?: string;
  Notes?: string;
  CaseTypeCode?: string;
  CaseTypeDescription?: string;
  SubArchive?: string;
  SubArchiveCode?: string;
  AccessCodeCode?: string;
  AccessCodeDescription?: string;
  AccessGroup?: string;
  AccessGroupRecno?: string;
  Paragraph?: string;
  ProjectRecno?: string;
  ProjectName?: string;
  ResponsiblePerson?: SifResponsibleEntity;
  ResponsiblePersonName?: string;
  ResponsibleEnterprise?: SifResponsibleEntity;
  ResponsibleEnterpriseName?: string;
  UID?: string;
  UIDOrigin?: string;
  URL?: string;
  eArchiveXMLFragment?: string;
  Contacts?: SifCaseContact[];
  CaseEstates?: SifCaseEstate[];
  Stages?: SifCaseStage[];
  AdditionalFields?: SifAdditionalField[];
  CustomFields?: unknown;
  ArchiveCodes?: unknown;
  Documents?: unknown;
  ReferringCases?: unknown;
  ReferringDocuments?: unknown;
  Remarks?: unknown;
  Keywords?: unknown;
  Milestones?: unknown;
  ProgressPlan?: {
    Recno?: string;
    Description?: string;
    WorkunitID?: string;
    ProgressPlanDetails?: {
      Recno?: number;
      Description?: string;
      Status?: string;
      Type?: string;
    };
    ActivePhases?: unknown;
  };
  SubjectSpecificMetaData?: string;
  SubjectSpecificMetaDataNamespace?: string;
  CaseRowPermissions?: string;
}

export interface SifGetCasesResult {
  Successful: boolean;
  Cases?: SifCaseResult[];
  TotalPageCount?: number;
  TotalCount?: number;
  NextDeltaLastDate?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// CaseService — GetCaseContacts
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
// CaseService — CreateCase / UpdateCase (result)
// ============================================================

export interface SifMutateCaseResult {
  Successful: boolean;
  Recno?: number;
  CaseNumber?: string;
  ImportedCaseNumber?: string;
  UID?: string;
  UIDOrigin?: string;
  URL?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// FileService — Upload
// ============================================================

export interface SifUploadInput {
  /** Base64-encoded file content for RPC transport */
  FileData: string;
  FileName: string;
  FileFormat?: string;
  User?: string;
}

export interface SifUploadResult {
  Successful: boolean;
  /** Use this reference in UploadedFileReference when creating a document */
  FileReference?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

export interface SifUploadStreamInput {
  FileData: string;
  FileName: string;
  FileFormat?: string;
  User?: string;
}

// ============================================================
// FileService — File metadata
// ============================================================

export interface SifFileMetadata {
  Recno?: number;
  DocumentRecno?: number;
  DocumentNumber?: string;
  Title?: string;
  Format?: string;
  Base64Data?: string;
  URL?: string;
  Size?: number;
  RelationTypeCode?: string;
  RelationTypeDescription?: string;
  VersionFormatCode?: string;
  VersionFormatDescription?: string;
  Note?: string;
  ModifiedBy?: string;
  CheckedOutBy?: string;
  CategoryCode?: string;
  CategoryDescription?: string;
  StatusCode?: string;
  StatusDescription?: string;
  AccessCodeCode?: string;
  AccessCodeDescription?: string;
  AccessCodeRecno?: string;
  Paragraph?: string;
  DegradeDate?: string;
  DegradeCode?: string;
  DisposalDate?: string;
  DisposalCode?: string;
  FiledOnPaper?: boolean;
  PaperLocation?: string;
  SignDate?: string;
  Version?: number;
  LastChangedDate?: string;
  AccessGroup?: string;
  AccessGroupRecno?: string;
  ExternalId?: SifExternalId;
  FileExternalId?: SifExternalId;
  UID?: string;
  UIDOrigin?: string;
  Type?: string;
  CustomFields?: unknown;
}

export interface SifGetFilesWithMetadataQuery {
  MaxReturnedFiles?: number;
  DocumentNumber?: string;
  CaseNumber?: string;
  LastDate?: string;
  Page?: number;
  SortCriterion?: "RecnoDescending" | "RecnoAscending";
  Recno?: number;
  IncludeFileData?: boolean;
  ADContextUser?: string;
  IncludeCustomFields?: boolean;
  ExternalId?: SifExternalId;
  UID?: string;
  UIDOrigin?: string;
  AdditionalFields?: SifAdditionalField[];
  AdditionalListFields?: SifAdditionalListField[];
  DateCriteria?: Array<{
    DateName: string;
    Operator: string;
    DateValue: string;
  }>;
}

export interface SifGetFilesWithMetadataResult {
  Successful: boolean;
  Files?: SifFileMetadata[];
  TotalPageCount?: number;
  TotalCount?: number;
  NextDeltaLastDate?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// DocumentService — File item inside CreateDocument / UpdateDocument
// ============================================================

export interface SifFileInput {
  Title: string;
  Format: string;
  UploadedFileReference?: string;
  Base64Data?: string;
  RelationType?: string;
  VersionFormat?: string;
  Note?: string;
  Category?: string;
  Status?: string;
  AccessCode?: string;
  DegradeCode?: string;
  DegradeDate?: string;
  FiledOnPaper?: boolean;
  PaperLocation?: string;
  ExternalId?: SifExternalId;
  AdditionalFields?: unknown;
}

// ============================================================
// DocumentService — Contact (Kontakt/sender/recipient)
// ============================================================

export interface SifDocumentContact {
  Role: string;
  /**
   * Identifies the contact. Use "recno:XXXX" when you only have the 360° recno.
   * Can also be org.nr / personnummer. Prefer this over ReferenceNumber.
   */
  ExternalId?: string;
  /** Alternative identifier — org.nr or personnummer */
  ReferenceNumber?: string;
  IsUnofficial?: boolean;
  DispatchChannel?: string;
}

export interface SifUnregisteredContact {
  Role: string;
  /** Swagger field name: ContactName (NOT Name) */
  ContactName?: string;
  ContactCompanyName?: string;
  ReferenceNumber?: string;
  IsUnofficial?: boolean;
  Address?: string;
  Country?: string;
  MobilePhone?: string;
  Phone?: string;
  Fax?: string;
  Email?: string;
  State?: string;
  ZipCode?: string;
  ZipPlace?: string;
  DispatchChannel?: string;
}

// ============================================================
// DocumentService — CreateDocument / UpdateDocument
// ============================================================

export interface SifCreateDocumentInput {
  Title: string;
  Archive?: string;
  Category?: string;
  Status?: string;
  CaseNumber?: string;
  CaseExternalId?: SifExternalId;
  DocumentDate?: string;
  JournalDate?: string;
  DispatchedDate?: string;
  UnofficialTitle?: string;
  ResponsiblePersonRecno?: number;
  ResponsiblePersonIdNumber?: string;
  ResponsiblePersonEmail?: string;
  ResponsiblePersonUserId?: string;
  ResponsibleEnterpriseRecno?: number;
  ResponsibleEnterpriseNumber?: string;
  Contacts?: SifDocumentContact[];
  UnregisteredContacts?: SifUnregisteredContact[];
  Files?: SifFileInput[];
  AdditionalFields?: SifAdditionalField[];
  AdditionalListFields?: SifAdditionalListField[];
  Keywords?: string[];
  Notes?: string;
  AccessCode?: string;
  AccessGroup?: string;
  Paragraph?: string;
  SendersReference?: string;
  FiledOnPaper?: boolean;
  ExternalId?: SifExternalId;
  ImportedDocumentNumber?: string;
  eArchiveXMLFragment?: string;
  DefaultValueSet?: string;
  ResponseCode?: string;
  SignOffWithResponseCode?: boolean;
  RunFilesInDocumentBatch?: boolean;
  ADContextUser?: string;
  ReferringCases?: Array<{ CaseNumber: string }>;
  ReferringDocuments?: Array<{ DocumentNumber: string }>;
  FilesFromTemplate?: Array<{
    ExternalId?: SifExternalId;
    Title?: string;
    TemplateId?: string;
  }>;
  Remarks?: Array<{
    Title?: string;
    Content?: string;
    RemarkType?: string;
  }>;
  Project?: string;
  Estates?: Array<{
    Recno?: number;
    ExternalId?: string;
    Role?: string;
  }>;
  RevisionStatus?: string;
  SubArchive?: string;
  ArchiveCodes?: SifArchiveCode[];
  RecordType?: string;
  Permissions?: SifPermission[];
}

export interface SifCreateDocumentResult {
  Successful: boolean;
  Recno?: number;
  DocumentNumber?: string;
  ImportedDocumentNumber?: string;
  UID?: string;
  UIDOrigin?: string;
  URL?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// DocumentService — Document returned inside GetCases (IncludeDocuments)
// ============================================================

export interface SifDocumentInCase {
  Recno: number;
  DocumentNumber?: string;
  Title?: string;
  Category?: string;
  CategoryDescription?: string;
  Status?: string;
  StatusDescription?: string;
  DocumentDate?: string;
  ResponsiblePersonName?: string;
  URL?: string;
}

// ============================================================
// DocumentService — UpdateDocument
// ============================================================

export interface SifUpdateDocumentInput {
  /** Identifies the document to update */
  Recno?: number;
  DocumentNumber?: string;
  Title?: string;
  Category?: string;
  Status?: string;
  DocumentDate?: string;
  AccessCode?: string;
  ResponsiblePersonRecno?: number;
  Contacts?: SifDocumentContact[];
  Files?: SifFileInput[];
  AdditionalFields?: SifAdditionalField[];
  AdditionalListFields?: SifAdditionalListField[];
  ADContextUser?: string;
}

export interface SifUpdateDocumentResult {
  Successful: boolean;
  Recno?: number;
  DocumentNumber?: string;
  URL?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// DocumentService — DispatchDocuments
// ============================================================

export interface SifDispatchDocumentItem {
  Recno?: number;
  DocumentNumber?: string;
}

export interface SifDispatchDocumentsInput {
  Documents: SifDispatchDocumentItem[];
  ADContextUser?: string;
}

export interface SifDispatchDocumentsResult {
  Successful: boolean;
  ErrorMessage?: string;
  ErrorDetails?: string;
  DocumentResult?: Array<{
    Successful: boolean;
    Recno?: number;
    DocumentNumber?: string;
    ImportedDocumentNumber?: string;
    UID?: string;
    UIDOrigin?: string;
    URL?: string;
    ErrorMessage?: string;
    ErrorDetails?: string;
  }>;
}

// ============================================================
// ContactService — GetEnterprises
// ============================================================

export interface SifGetEnterpriseQuery {
  ADContextUser?: string;
  Recno?: number;
  Name?: string;
  ExternalID?: string;
  /** Norwegian organisation number (9 digits) */
  EnterpriseNumber?: string;
  Active?: boolean;
  Categories?: string[];
  Initials?: string;
  Page?: number;
  MaxRows?: number;
  SortCriterion?: "RecnoDescending" | "RecnoAscending";
  IncludeCustomFields?: boolean;
  Email?: string;
  AlternativeEmail?: string;
  AdditionalFields?: SifAdditionalField[];
  AdditionalListFields?: SifAdditionalListField[];
  DateCriteria?: Array<{
    DateName: string;
    Operator: string;
    DateValue: string;
  }>;
  CreatedDateRange?: { From?: string; To?: string };
  ModifiedDateRange?: { From?: string; To?: string };
}

export interface SifEnterpriseResult {
  Recno: number;
  Name: string;
  /** Norwegian organisation number — Swagger field: EnterpriseNumber */
  EnterpriseNumber?: string;
  ExternalID?: string;
  Email?: string;
  AlternativeEmail?: string;
  PhoneNumber?: string;
  MobilePhone?: string;
  Telefax?: string;
  PostAddress?: SifAddress;
  OfficeAddress?: SifAddress;
  Initials?: string;
  Web?: string;
  Categories?: string[];
  ParentEnterpriseNumber?: string;
  CustomNo1?: string;
  CustomNo2?: string;
  CustomNo3?: string;
  Active?: boolean;
  CreatedDate?: string;
  ModifiedDate?: string;
  AccessGroup?: string;
  AccessGroupRecno?: string;
  AlternativeEmail2?: string;
  AdditionalFields?: unknown;
  ContactRelations?: unknown;
}

export interface SifGetEnterpriseResult {
  Successful: boolean;
  Enterprises?: SifEnterpriseResult[];
  TotalPageCount?: number;
  TotalCount?: number;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// ContactService — GetContactPersons
// ============================================================

export interface SifGetContactPersonsQuery {
  ADContextUser?: string;
  Recno?: number;
  Name?: string;
  ExternalId?: string;
  Active?: boolean;
  Categories?: string[];
  Page?: number;
  MaxRows?: number;
  SortCriterion?: "RecnoDescending" | "RecnoAscending";
  IncludeCustomFields?: boolean;
  Email?: string;
  AlternativeEmail?: string;
  Web?: string;
  AdditionalFields?: SifAdditionalField[];
  AdditionalListFields?: SifAdditionalListField[];
  DateCriteria?: Array<{
    DateName: string;
    Operator: string;
    DateValue: string;
  }>;
  CreatedDateRange?: { From?: string; To?: string };
  ModifiedDateRange?: { From?: string; To?: string };
}

export interface SifContactPersonResult {
  Recno: number;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  /**
   * Full display name — may be present in some SIF versions as a convenience field.
   * When absent, compose from FirstName + LastName.
   */
  Name?: string;
  Title?: string;
  Initials?: string;
  DirectLine?: string;
  PhoneNumber?: string;
  MobilePhone?: string;
  PrivateTelephone?: string;
  Email?: string;
  AlternativeEmail?: string;
  Web?: string;
  DirectFax?: string;
  /** Plain enterprise name as stored in 360° */
  Enterprise?: string;
  /**
   * Nested enterprise object. Recno used for matching contacts by employer.
   * EnterpriseRecno may also appear as a flat field on some SIF versions.
   */
  EnterpriseEntity?: {
    Recno: number;
    ExternalId?: string;
    Referencenumber?: string;
  };
  /** Flat recno field — present on some SIF versions in addition to EnterpriseEntity */
  EnterpriseRecno?: number;
  ExternalId?: string;
  Active?: boolean;
  Gender?: "Female" | "Male";
  Categories?: string[];
  PrivateAddress?: SifAddress;
  PostAddress?: SifAddress;
  CreatedDate?: string;
  ModifiedDate?: string;
  AccessGroup?: string;
  AccessGroupRecno?: string;
  CustomNo1?: string;
  CustomNo2?: string;
  CustomNo3?: string;
  AdditionalFields?: unknown;
}

export interface SifGetContactPersonsResult {
  Successful: boolean;
  ContactPersons?: SifContactPersonResult[];
  TotalPageCount?: number;
  TotalCount?: number;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// ContactService — SynchronizeContactPerson
// ============================================================

export interface SifSynchronizeContactPersonInput {
  /** Stable external key — SIF upserts on this */
  ExternalId: string;
  ADContextUser?: string;
  DataSource?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  /**
   * Enterprise identifier. Use "recno:XXXX" when companyRecno is known.
   * Plain text names are NOT supported by 360° and cause a LookupException.
   */
  Enterprise?: string;
  PhoneNumber?: string;
  MobilePhone?: string;
  PrivateTelephone?: string;
  Email?: string;
  AlternativeEmail?: string;
  Web?: string;
  DirectFax?: string;
  DirectLine?: string;
  Initials?: string;
  Title?: string;
  Active?: boolean;
  Gender?: "Female" | "Male";
  Categories?: string[];
  PrivateAddress?: SifAddress;
  PostAddress?: SifAddress;
  CustomNo1?: string;
  CustomNo2?: string;
  CustomNo3?: string;
  AccessGroup?: string;
  AdditionalFields?: SifAdditionalField[];
}

export interface SifSynchronizeContactPersonResult {
  Successful: boolean;
  /** Recno of the created or updated contact person in PNB */
  Recno?: number;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// ContactService — UpdateContactPerson
// ============================================================

export interface SifUpdateContactPersonInput {
  Recno: number;
  ADContextUser?: string;
  FirstName?: string;
  MiddleName?: string;
  LastName?: string;
  ExternalId?: string;
  Enterprise?: string;
  PhoneNumber?: string;
  MobilePhone?: string;
  PrivateTelephone?: string;
  Email?: string;
  AlternativeEmail?: string;
  Web?: string;
  DirectFax?: string;
  DirectLine?: string;
  Initials?: string;
  Title?: string;
  Active?: boolean;
  Gender?: "Female" | "Male";
  Categories?: string[];
  PrivateAddress?: SifAddress;
  PostAddress?: SifAddress;
  CustomNo1?: string;
  CustomNo2?: string;
  CustomNo3?: string;
  AccessGroup?: string;
  AdditionalFields?: SifAdditionalField[];
}

export interface SifUpdateContactPersonResult {
  Successful: boolean;
  Recno?: number;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// EstateService — GetEstates
// ============================================================

export interface SifGetEstatesQuery {
  ADContextUser?: string;
  Recno?: number;
  ExternalId?: string;
  EstateNumber?: number;
  WorkNumber?: number;
  SectionNumber?: number;
  LeaseHoldNumber?: number;
  BuildingNumber?: number;
  Address?: SifAddress;
  Page?: number;
  /** Swagger field name: MaxRows (NOT MaxResults) */
  MaxRows?: number;
  SortCriterion?: "RecnoDescending" | "RecnoAscending";
  IncludeEstateRelations?: boolean;
}

export interface SifEstateResult {
  Recno: number;
  UID?: string;
  UIDOrigin?: string;
  ExternalId?: string;
  Description?: string;
  Type?: string;
  Category?: string;
  Status?: string;
  AccessGroup?: string;
  Address?: SifAddress;
  EstateNumber?: number;
  WorkNumber?: number;
  SectionNumber?: number;
  LeaseHoldNumber?: number;
  BuildingNumber?: number;
  Municipality?: string;
  AdditionalFields?: unknown;
  EstateRelations?: unknown;
}

export interface SifGetEstatesResult {
  Successful: boolean;
  Estates?: SifEstateResult[];
  TotalPageCount?: number;
  TotalCount?: number;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// SearchService — Search
// ============================================================

export interface SifSearchQuery {
  SearchKeyword: string;
  Entity?: string;
}

export interface SifSearchResult {
  Successful: boolean;
  Recnos?: number[];
  ErrorMessage?: string;
  ErrorDetails?: string;
}

// ============================================================
// UserService — GetUsers / SynchronizeUser / UpdateUser
// ============================================================

export interface SifUserProfile {
  Role?: string;
  EnterpriseId?: string;
  EnterpriseRecno?: string;
  EnterpriseNumber?: string;
  RoleDescription?: string;
  IsDefault?: boolean;
  IsLockedForSync?: boolean;
  FromDate?: string;
  ToDate?: string;
}

export interface SifUserAccessGroup {
  AccessGroup?: string;
  AccessGroupRecno?: string;
  FromDate?: string;
  ToDate?: string;
}

export interface SifUserResult {
  Login?: string;
  ContactExternalId?: string;
  ContactRecno?: number;
  IsActive?: boolean;
  IsServiceUser?: boolean;
  Language?: string;
  Profiles?: SifUserProfile[];
  AccessGroups?: SifUserAccessGroup[];
}

export interface SifGetUsersQuery {
  ADContextUser?: string;
  UserId?: string;
  ContactExternalId?: string;
  ContactRecno?: number;
  Page?: number;
  MaxRows?: number;
  SortCriterion?: "RecnoDescending" | "RecnoAscending";
}

export interface SifGetUsersResult {
  Successful: boolean;
  Users?: SifUserResult[];
  TotalPageCount?: number;
  TotalCount?: number;
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
