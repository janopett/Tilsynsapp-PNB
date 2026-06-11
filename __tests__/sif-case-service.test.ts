/**
 * Tests for SIF CaseService — findCaseInSif and searchCasesInSif.
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
}));

import { findCaseInSif, searchCasesInSif } from "@/lib/sif/case-service";
import {
  SifCaseNotFoundError,
  SifMultipleCasesFoundError,
  SifValidationError,
} from "@/lib/sif/errors";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

const caseResult = {
  Recno: 100,
  CaseNumber: "25/100",
  Title: "Testgate 1 tilsyn",
  URL: "/Cases/100",
  Stages: [],
};

beforeEach(() => {
  mockRpc.mockReset();
});

// ── findCaseInSif ────────────────────────────────────────────────────────────

describe("findCaseInSif", () => {
  it("throws SifValidationError when no criteria provided", async () => {
    await expect(findCaseInSif({})).rejects.toBeInstanceOf(SifValidationError);
  });

  it("returns mapped case on success by caseNumber", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [caseResult] });
    const result = await findCaseInSif({ caseNumber: "25/100" });
    expect(result.caseNumber).toBe("25/100");
    expect(result.recno).toBe(100);
  });

  it("prepends baseUrl to relative case URL", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [caseResult] });
    const result = await findCaseInSif({ caseNumber: "25/100" });
    expect(result.url).toBe("https://demo.example.com/Cases/100");
  });

  it("throws SifCaseNotFoundError when no cases returned", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [] });
    await expect(findCaseInSif({ caseNumber: "99/999" })).rejects.toBeInstanceOf(
      SifCaseNotFoundError
    );
  });

  it("throws SifCaseNotFoundError when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false, ErrorMessage: "Not found" });
    await expect(findCaseInSif({ caseNumber: "99/999" })).rejects.toBeInstanceOf(
      SifCaseNotFoundError
    );
  });

  it("throws SifMultipleCasesFoundError when more than one case returned", async () => {
    mockRpc.mockResolvedValueOnce({
      Successful: true,
      Cases: [caseResult, { ...caseResult, Recno: 101, CaseNumber: "25/101" }],
    });
    await expect(findCaseInSif({ caseNumber: "25" })).rejects.toBeInstanceOf(
      SifMultipleCasesFoundError
    );
  });

  it("uses UID when caseNumber is absent", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [caseResult] });
    await findCaseInSif({ uid: "some-uid" });
    expect(mockRpc).toHaveBeenCalledWith(
      "CaseService",
      "GetCases",
      expect.objectContaining({ UID: "some-uid" }),
      undefined
    );
  });

  it("uses ExternalId when neither caseNumber nor uid given", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [caseResult] });
    await findCaseInSif({ externalId: "ext-123", externalSystem: "MySystem" });
    expect(mockRpc).toHaveBeenCalledWith(
      "CaseService",
      "GetCases",
      expect.objectContaining({ ExternalId: { Id: "ext-123", Type: "MySystem" } }),
      undefined
    );
  });
});

// ── searchCasesInSif ─────────────────────────────────────────────────────────

describe("searchCasesInSif", () => {
  it("returns empty array for blank query", async () => {
    const result = await searchCasesInSif("   ");
    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("deduplicates results from number and title searches", async () => {
    const duplicate = { ...caseResult };
    // Both searches return the same case (same Recno)
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Cases: [duplicate] })
      .mockResolvedValueOnce({ Successful: true, Cases: [duplicate] });

    const result = await searchCasesInSif("25/100");
    expect(result).toHaveLength(1);
    expect(result[0].recno).toBe(100);
  });

  it("merges results from number and title searches", async () => {
    const case2 = { ...caseResult, Recno: 200, CaseNumber: "25/200" };
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Cases: [caseResult] })
      .mockResolvedValueOnce({ Successful: true, Cases: [case2] });

    const result = await searchCasesInSif("tilsyn");
    expect(result).toHaveLength(2);
  });

  it("skips failed search queries gracefully", async () => {
    mockRpc
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ Successful: true, Cases: [caseResult] });

    const result = await searchCasesInSif("25");
    expect(result).toHaveLength(1);
  });

  it("respects maxResults limit", async () => {
    const manyCases = Array.from({ length: 8 }, (_, i) => ({
      ...caseResult,
      Recno: 100 + i,
      CaseNumber: `25/${100 + i}`,
    }));
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Cases: manyCases })
      .mockResolvedValueOnce({ Successful: true, Cases: [] });

    const result = await searchCasesInSif("25", 5);
    expect(result).toHaveLength(5);
  });
});
