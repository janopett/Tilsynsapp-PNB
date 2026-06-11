/**
 * Tests for SIF EstateService — getEstateByMatrikkel and getCaseEstates.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

import { getEstateByMatrikkel, getCaseEstates } from "@/lib/sif/estate-service";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

const rawEstate = {
  Recno: 1,
  Address: { StreetAddress: "Testgate 1", ZipCode: "1234", ZipPlace: "Testby" },
  EstateNumber: 42,
  WorkNumber: 7,
  SectionNumber: null,
  LeaseHoldNumber: null,
  Municipality: "Testkommune",
};

beforeEach(() => {
  mockRpc.mockReset();
});

// ── getEstateByMatrikkel ──────────────────────────────────────────────────────

describe("getEstateByMatrikkel", () => {
  it("returns the first estate on success", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [rawEstate] });
    const result = await getEstateByMatrikkel(42, 7);
    expect(result?.Recno).toBe(1);
    expect(result?.EstateNumber).toBe(42);
  });

  it("calls EstateService/GetEstates with gnr and bnr", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [rawEstate] });
    await getEstateByMatrikkel(42, 7);
    expect(mockRpc).toHaveBeenCalledWith(
      "EstateService",
      "GetEstates",
      expect.objectContaining({ EstateNumber: 42, WorkNumber: 7 }),
      undefined
    );
  });

  it("returns null when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false });
    expect(await getEstateByMatrikkel(42, 7)).toBeNull();
  });

  it("returns null when Estates array is empty", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [] });
    expect(await getEstateByMatrikkel(42, 7)).toBeNull();
  });

  it("returns null without throwing when sifRpcCall throws", async () => {
    mockRpc.mockRejectedValueOnce(new Error("network error"));
    expect(await getEstateByMatrikkel(42, 7)).toBeNull();
  });
});

// ── getCaseEstates ────────────────────────────────────────────────────────────

describe("getCaseEstates", () => {
  it("returns empty array and skips RPC when neither caseRecno nor caseNumber provided", async () => {
    const result = await getCaseEstates({});
    expect(result).toEqual([]);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns mapped estates for a caseRecno query", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [rawEstate] });
    const result = await getCaseEstates({ caseRecno: 100 });
    expect(result).toHaveLength(1);
    expect(result[0].recno).toBe(1);
    expect(result[0].address).toBe("Testgate 1");
    expect(result[0].gnr).toBe("42");
    expect(result[0].bnr).toBe("7");
    expect(result[0].municipality).toBe("Testkommune");
  });

  it("sends CaseRecno in query when provided", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [rawEstate] });
    await getCaseEstates({ caseRecno: 100 });
    expect(mockRpc).toHaveBeenCalledWith(
      "EstateService",
      "GetEstates",
      expect.objectContaining({ CaseRecno: 100 }),
      undefined
    );
  });

  it("sends CaseNumber in query when caseRecno is absent", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [rawEstate] });
    await getCaseEstates({ caseNumber: "25/100" });
    expect(mockRpc).toHaveBeenCalledWith(
      "EstateService",
      "GetEstates",
      expect.objectContaining({ CaseNumber: "25/100" }),
      undefined
    );
  });

  it("returns empty array when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false });
    expect(await getCaseEstates({ caseRecno: 100 })).toEqual([]);
  });

  it("returns empty array without throwing when sifRpcCall throws", async () => {
    mockRpc.mockRejectedValueOnce(new Error("network error"));
    expect(await getCaseEstates({ caseRecno: 100 })).toEqual([]);
  });

  it("omits snr when SectionNumber is null", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Estates: [rawEstate] });
    const result = await getCaseEstates({ caseRecno: 1 });
    expect(result[0].snr).toBeUndefined();
  });

  it("omits snr when SectionNumber is 0", async () => {
    mockRpc.mockResolvedValueOnce({
      Successful: true,
      Estates: [{ ...rawEstate, SectionNumber: 0 }],
    });
    const result = await getCaseEstates({ caseRecno: 1 });
    expect(result[0].snr).toBeUndefined();
  });

  it("includes snr when SectionNumber is non-zero", async () => {
    mockRpc.mockResolvedValueOnce({
      Successful: true,
      Estates: [{ ...rawEstate, SectionNumber: 3 }],
    });
    const result = await getCaseEstates({ caseRecno: 1 });
    expect(result[0].snr).toBe("3");
  });

  it("includes fnr when LeaseHoldNumber is non-zero", async () => {
    mockRpc.mockResolvedValueOnce({
      Successful: true,
      Estates: [{ ...rawEstate, LeaseHoldNumber: 5 }],
    });
    const result = await getCaseEstates({ caseRecno: 1 });
    expect(result[0].fnr).toBe("5");
  });
});
