/**
 * Tests for SIF extensions/search-service.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

// search-service imports case-service which imports settings — mock to avoid Supabase init
jest.mock("@/lib/sif/settings", () => ({
  loadSifSettingsWithEnvFallback: jest.fn().mockResolvedValue({
    baseUrl: "https://demo.example.com",
    rpcPath: "/rpc",
    timeoutMs: 30000,
    authMode: "authkey",
    authkey: "test-key",
    oauthClientId: "",
    oauthClientSecret: "",
    oauthTokenUrl: "",
    oauthScope: "",
    docArchive: "",
    docCategory: "",
    docStatus: "",
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
  toSifClientConfig: jest.fn().mockReturnValue({
    baseUrl: "https://demo.example.com",
    rpcPath: "/rpc",
    timeoutMs: 30000,
    authConfig: { mode: "authkey", authKey: "test-key" },
  }),
}));

import {
  searchSif,
  searchDocumentsInCase,
  searchCasesGlobal,
  searchDocumentsGlobal,
} from "@/lib/sif/extensions/search-service";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

beforeEach(() => {
  mockRpc.mockReset();
});

// ── searchSif ─────────────────────────────────────────────────────────────────

describe("searchSif", () => {
  it("returns recnos from a successful search", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Recnos: [1, 2, 3] });
    const result = await searchSif("tilsyn", "Case");
    expect(result.recnos).toEqual([1, 2, 3]);
    expect(result.total).toBe(3);
  });

  it("returns empty result when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false, ErrorMessage: "forbidden" });
    const result = await searchSif("tilsyn");
    expect(result.recnos).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("returns empty result when Recnos is absent", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true });
    const result = await searchSif("tilsyn");
    expect(result.recnos).toEqual([]);
  });

  it("passes keyword and entity to SearchService/Search", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Recnos: [] });
    await searchSif("rapport", "Document");
    expect(mockRpc).toHaveBeenCalledWith(
      "SearchService",
      "Search",
      expect.objectContaining({ SearchKeyword: "rapport", Entity: "Document" }),
      undefined
    );
  });
});

// ── searchDocumentsInCase ────────────────────────────────────────────────────

describe("searchDocumentsInCase", () => {
  const rawDoc = { Recno: 1, DocumentNumber: "25/100-1", Title: "Tilsynsrapport" };

  it("returns matching documents", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Documents: [rawDoc] });
    const docs = await searchDocumentsInCase("25/100", "tilsyn");
    expect(docs).toHaveLength(1);
    expect(docs[0].DocumentNumber).toBe("25/100-1");
  });

  it("wraps keyword in % wildcards for partial matching", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Documents: [] });
    await searchDocumentsInCase("25/100", "tilsyn");
    expect(mockRpc).toHaveBeenCalledWith(
      "DocumentService",
      "GetDocuments",
      expect.objectContaining({ Title: "%tilsyn%" }),
      undefined
    );
  });

  it("returns empty array when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false });
    expect(await searchDocumentsInCase("25/100", "tilsyn")).toEqual([]);
  });
});

// ── searchCasesGlobal ─────────────────────────────────────────────────────────

describe("searchCasesGlobal", () => {
  const rawCase = { Recno: 100, CaseNumber: "25/100", Title: "Test", URL: "/Cases/100" };

  it("returns empty array when search returns no recnos", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Recnos: [] });
    expect(await searchCasesGlobal("tilsyn")).toEqual([]);
  });

  it("resolves recnos to full SifCase objects", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Recnos: [100] }) // SearchService/Search
      .mockResolvedValueOnce({ Successful: true, Cases: [rawCase] }); // GetCases by recno

    const cases = await searchCasesGlobal("tilsyn");
    expect(cases).toHaveLength(1);
    expect(cases[0].caseNumber).toBe("25/100");
    expect(cases[0].recno).toBe(100);
  });

  it("skips recnos whose GetCases call fails", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Recnos: [100, 101] })
      .mockRejectedValueOnce(new Error("timeout")) // recno 100 fails
      .mockResolvedValueOnce({ Successful: true, Cases: [{ ...rawCase, Recno: 101 }] });

    const cases = await searchCasesGlobal("tilsyn");
    expect(cases).toHaveLength(1);
    expect(cases[0].recno).toBe(101);
  });

  it("respects maxResults when slicing recnos", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Recnos: [1, 2, 3, 4, 5] });
    for (let i = 1; i <= 2; i++) {
      mockRpc.mockResolvedValueOnce({
        Successful: true,
        Cases: [{ ...rawCase, Recno: i }],
      });
    }
    const cases = await searchCasesGlobal("tilsyn", 2);
    expect(cases).toHaveLength(2);
  });
});

// ── searchDocumentsGlobal ─────────────────────────────────────────────────────

describe("searchDocumentsGlobal", () => {
  const rawDoc = { Recno: 1, DocumentNumber: "25/100-1", Title: "Rapport" };

  it("returns empty array when search returns no recnos", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Recnos: [] });
    expect(await searchDocumentsGlobal("rapport")).toEqual([]);
  });

  it("resolves recnos to documents", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Recnos: [1] })
      .mockResolvedValueOnce({ Successful: true, Documents: [rawDoc] });

    const docs = await searchDocumentsGlobal("rapport");
    expect(docs).toHaveLength(1);
    expect(docs[0].DocumentNumber).toBe("25/100-1");
  });

  it("skips documents whose GetDocuments call returns null", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Recnos: [1, 2] })
      .mockResolvedValueOnce({ Successful: true, Documents: [rawDoc] })
      .mockResolvedValueOnce({ Successful: true, Documents: [] }); // recno 2 returns nothing

    const docs = await searchDocumentsGlobal("rapport");
    expect(docs).toHaveLength(1);
  });
});
