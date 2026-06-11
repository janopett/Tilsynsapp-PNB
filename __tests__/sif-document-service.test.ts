/**
 * Tests for SIF DocumentService — CreateDocument, UpdateDocument, GetDocuments.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

jest.mock("@/lib/sif/settings", () => ({
  loadSifSettingsWithEnvFallback: jest.fn().mockResolvedValue({
    baseUrl: "https://demo.example.com",
    rpcPath: "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
    timeoutMs: 30000,
    authMode: "authkey",
    authkey: "test-key",
    oauthClientId: "",
    oauthClientSecret: "",
    oauthTokenUrl: "",
    oauthScope: "",
    docArchive: "recno:2",
    docCategory: "recno:111",
    docStatus: "J",
    docTitleTemplate: "",
    docMainFileRelationType: "H",
    docAttachmentRelationType: "V",
    roleMunicipalitySender: "AV",
    roleApplicantRecipient: "Mottaker",
    roleCopyRecipient: "KM",
    responsiblePersonRecno: 0,
    docAccessCode: "",
    autoDispatch: false,
  }),
}));

import {
  createInspectionDocumentInSif,
  fetchCaseDocumentsFromSif,
  updateInspectionDocumentInSif,
} from "@/lib/sif/document-service";
import { SifCreateDocumentError } from "@/lib/sif/errors";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

const baseFile = {
  title: "Tilsynsrapport.pdf",
  format: "pdf",
  uploadedFileReference: "ref-abc-123",
};

const successResult = {
  Successful: true,
  Recno: 999,
  DocumentNumber: "25/100-1",
  URL: "/Cases/Document/999",
};

beforeEach(() => {
  mockRpc.mockReset();
});

// ── createInspectionDocumentInSif ────────────────────────────────────────────

describe("createInspectionDocumentInSif", () => {
  it("creates document and returns mapped result", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    const doc = await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn Testgate 1",
      files: [baseFile],
    });
    expect(doc.recno).toBe(999);
    expect(doc.documentNumber).toBe("25/100-1");
  });

  it("resolves relative URL using baseUrl", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    const doc = await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [baseFile],
    });
    expect(doc.url).toBe("https://demo.example.com/Cases/Document/999");
  });

  it("sends contacts as ExternalId recno:XXXX format", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [baseFile],
      contacts: [{ role: "Mottaker", recno: 12345 }],
    });
    const payload = mockRpc.mock.calls[0][2];
    expect(payload.Contacts[0].ExternalId).toBe("recno:12345");
    expect(payload.Contacts[0].Role).toBe("Mottaker");
  });

  it("uses referenceNumber as ExternalId when provided", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [baseFile],
      contacts: [{ role: "Mottaker", recno: 12345, referenceNumber: "12345678901" }],
    });
    const payload = mockRpc.mock.calls[0][2];
    expect(payload.Contacts[0].ExternalId).toBe("12345678901");
  });

  it("adds stageRecno as AdditionalFields.ToStage", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [baseFile],
      stageRecno: 777,
    });
    const payload = mockRpc.mock.calls[0][2];
    expect(payload.AdditionalFields).toContainEqual({ Name: "ToStage", Value: "777" });
  });

  it("includes permissions when provided", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [baseFile],
      permissions: [{ ContactExternalId: "recno:42", ViewFile: true }],
    });
    const payload = mockRpc.mock.calls[0][2];
    expect(payload.Permissions).toEqual([{ ContactExternalId: "recno:42", ViewFile: true }]);
  });

  it("sets first file as main (H) and second as attachment (V)", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [
        baseFile,
        { title: "vedlegg.jpg", format: "jpg", uploadedFileReference: "ref-vedlegg" },
      ],
    });
    const payload = mockRpc.mock.calls[0][2];
    expect(payload.Files[0].RelationType).toBe("H");
    expect(payload.Files[1].RelationType).toBe("V");
  });

  it("throws SifCreateDocumentError when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false, ErrorMessage: "Permission denied" });
    await expect(
      createInspectionDocumentInSif({ caseNumber: "25/100", title: "T", files: [baseFile] })
    ).rejects.toBeInstanceOf(SifCreateDocumentError);
  });

  it("includes accessCode in payload when provided", async () => {
    mockRpc.mockResolvedValueOnce(successResult);
    await createInspectionDocumentInSif({
      caseNumber: "25/100",
      title: "Tilsyn",
      files: [baseFile],
      accessCode: "U",
    });
    expect(mockRpc.mock.calls[0][2].AccessCode).toBe("U");
  });
});

// ── fetchCaseDocumentsFromSif ─────────────────────────────────────────────────

describe("fetchCaseDocumentsFromSif", () => {
  it("returns empty array when no documents", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Documents: [] });
    const docs = await fetchCaseDocumentsFromSif("25/100");
    expect(docs).toEqual([]);
  });

  it("returns empty array when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false });
    const docs = await fetchCaseDocumentsFromSif("25/100");
    expect(docs).toEqual([]);
  });

  it("resolves relative document URLs", async () => {
    mockRpc.mockResolvedValueOnce({
      Successful: true,
      Documents: [{ Recno: 1, DocumentNumber: "25/100-1", URL: "/Cases/Document/1" }],
    });
    const docs = await fetchCaseDocumentsFromSif("25/100");
    expect(docs[0].URL).toBe("https://demo.example.com/Cases/Document/1");
  });
});

// ── updateInspectionDocumentInSif ─────────────────────────────────────────────

describe("updateInspectionDocumentInSif", () => {
  it("updates document and returns document number", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, DocumentNumber: "25/100-1", Recno: 999 });
    const doc = await updateInspectionDocumentInSif({
      documentNumber: "25/100-1",
      files: [baseFile],
    });
    expect(doc.documentNumber).toBe("25/100-1");
  });

  it("includes SyncDocumentContacts when contacts provided", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, DocumentNumber: "25/100-1" });
    await updateInspectionDocumentInSif({
      documentNumber: "25/100-1",
      files: [baseFile],
      contacts: [{ role: "Mottaker", recno: 42 }],
    });
    const payload = mockRpc.mock.calls[0][2];
    expect(payload.SyncDocumentContacts).toBe(true);
    expect(payload.Contacts[0].ExternalId).toBe("recno:42");
  });

  it("throws SifCreateDocumentError when update fails", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false, ErrorMessage: "Not found" });
    await expect(
      updateInspectionDocumentInSif({ documentNumber: "25/100-1", files: [baseFile] })
    ).rejects.toBeInstanceOf(SifCreateDocumentError);
  });
});
