/**
 * Integration-style test for the archival orchestrator.
 * Mocks all SIF service calls.
 */
import { archiveInspectionToSif } from "@/lib/sif/archival";
import type { ArchivalContext } from "@/lib/sif/archival";
import { SifCaseNotFoundError } from "@/lib/sif/errors";

// Mock all external SIF calls
jest.mock("@/lib/sif/case-service", () => ({
  findCaseInSif: jest.fn(),
}));
jest.mock("@/lib/sif/file-service", () => ({
  uploadFilesToSif: jest.fn(),
  mimeTypeToFormat: jest.fn().mockReturnValue("pdf"),
}));
jest.mock("@/lib/sif/document-service", () => ({
  createInspectionDocumentInSif: jest.fn(),
}));

import { findCaseInSif } from "@/lib/sif/case-service";
import { uploadFilesToSif } from "@/lib/sif/file-service";
import { createInspectionDocumentInSif } from "@/lib/sif/document-service";

const mockFindCase = findCaseInSif as jest.MockedFunction<typeof findCaseInSif>;
const mockUpload = uploadFilesToSif as jest.MockedFunction<typeof uploadFilesToSif>;
const mockCreateDoc = createInspectionDocumentInSif as jest.MockedFunction<
  typeof createInspectionDocumentInSif
>;

const baseContext: ArchivalContext = {
  inspectionId: "insp-uuid-001",
  caseNumber: "24/1234",
  propertyAddress: "Testgata 1, 0001 Oslo",
  inspectionDate: "2024-06-01",
  pdfBuffer: Buffer.from("fake pdf"),
  pdfFileName: "Tilsynsrapport_Testgata_1_2024-06-01.pdf",
  attachments: [],
};

const mockSifCase = {
  recno: 100,
  caseNumber: "24/1234",
  title: "Byggesak Testgata 1",
};

const mockSifDocument = {
  recno: 200,
  documentNumber: "24/1234-3",
  url: "https://example.com/doc/200",
};

describe("archiveInspectionToSif", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns success status with all SIF references", async () => {
    mockFindCase.mockResolvedValueOnce(mockSifCase);
    mockUpload.mockResolvedValueOnce([
      { fileReference: "ref-001", fileName: "Tilsynsrapport_Testgata_1_2024-06-01.pdf" },
    ]);
    mockCreateDoc.mockResolvedValueOnce(mockSifDocument);

    const result = await archiveInspectionToSif(baseContext);

    expect(result.status).toBe("success");
    expect(result.inspection_id).toBe("insp-uuid-001");
    expect(result.sif_case_number).toBe("24/1234");
    expect(result.sif_case_recno).toBe(100);
    expect(result.sif_document_number).toBe("24/1234-3");
    expect(result.sif_document_recno).toBe(200);
    expect(result.sif_document_url).toBe("https://example.com/doc/200");
    expect(result.archived_at).toBeDefined();
    expect(result.error_message).toBeUndefined();
  });

  it("returns failed status when case is not found", async () => {
    mockFindCase.mockRejectedValueOnce(
      new SifCaseNotFoundError("24/1234")
    );

    const result = await archiveInspectionToSif(baseContext);

    expect(result.status).toBe("failed");
    expect(result.error_message).toContain("SIF_CASE_NOT_FOUND");
    expect(result.sif_document_number).toBeUndefined();
  });

  it("returns failed status when upload fails", async () => {
    mockFindCase.mockResolvedValueOnce(mockSifCase);
    mockUpload.mockRejectedValueOnce(new Error("Storage unavailable"));

    const result = await archiveInspectionToSif(baseContext);

    expect(result.status).toBe("failed");
    expect(result.error_message).toContain("Storage unavailable");
  });

  it("returns failed status when document creation fails", async () => {
    mockFindCase.mockResolvedValueOnce(mockSifCase);
    mockUpload.mockResolvedValueOnce([
      { fileReference: "ref-001", fileName: "rapport.pdf" },
    ]);
    mockCreateDoc.mockRejectedValueOnce(new Error("Document creation failed"));

    const result = await archiveInspectionToSif(baseContext);

    expect(result.status).toBe("failed");
    expect(result.error_message).toContain("Document creation failed");
  });

  it("returns failed status when no PDF provided", async () => {
    mockFindCase.mockResolvedValueOnce(mockSifCase);

    const ctx: ArchivalContext = {
      ...baseContext,
      pdfBuffer: undefined,
      pdfFileName: undefined,
      attachments: [],
    };

    const result = await archiveInspectionToSif(ctx);

    expect(result.status).toBe("failed");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("includes attachments in upload call", async () => {
    mockFindCase.mockResolvedValueOnce(mockSifCase);
    mockUpload.mockResolvedValueOnce([
      { fileReference: "ref-pdf", fileName: "rapport.pdf" },
      { fileReference: "ref-img", fileName: "foto.jpg" },
    ]);
    mockCreateDoc.mockResolvedValueOnce(mockSifDocument);

    const ctx: ArchivalContext = {
      ...baseContext,
      attachments: [
        { fileName: "foto.jpg", fileData: Buffer.from("img"), mimeType: "image/jpeg" },
      ],
    };

    await archiveInspectionToSif(ctx);

    const uploadCall = mockUpload.mock.calls[0][0];
    expect(uploadCall).toHaveLength(2); // PDF + 1 attachment
    expect(uploadCall[0].fileName).toBe(baseContext.pdfFileName);
    expect(uploadCall[1].fileName).toBe("foto.jpg");
  });

  it("stores request_payload_json with correlationId and inspection details", async () => {
    mockFindCase.mockResolvedValueOnce(mockSifCase);
    mockUpload.mockResolvedValueOnce([
      { fileReference: "ref-001", fileName: "rapport.pdf" },
    ]);
    mockCreateDoc.mockResolvedValueOnce(mockSifDocument);

    const result = await archiveInspectionToSif(baseContext);

    expect(result.request_payload_json).toMatchObject({
      inspectionId: "insp-uuid-001",
      caseNumber: "24/1234",
      propertyAddress: "Testgata 1, 0001 Oslo",
    });
    expect(result.request_payload_json?.correlationId).toBeDefined();
  });
});
