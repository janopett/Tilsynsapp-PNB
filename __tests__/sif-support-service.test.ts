/**
 * Tests for SIF SupportService — getSifVersion and testSifConnection.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

import { getSifVersion, testSifConnection } from "@/lib/sif/support-service";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

beforeEach(() => {
  mockRpc.mockReset();
});

// ── getSifVersion ─────────────────────────────────────────────────────────────

describe("getSifVersion", () => {
  it("returns version and buildDate from SIFVersion field", async () => {
    mockRpc.mockResolvedValueOnce({ SIFVersion: "6.9.215", BuildDate: "2025-01-01" });
    const ver = await getSifVersion();
    expect(ver.version).toBe("6.9.215");
    expect(ver.buildDate).toBe("2025-01-01");
  });

  it("falls back to _raw string when SIFVersion is absent", async () => {
    mockRpc.mockResolvedValueOnce({ _raw: "6.9.100" });
    const ver = await getSifVersion();
    expect(ver.version).toBe("6.9.100");
  });

  it("returns fallback label when both SIFVersion and _raw are absent", async () => {
    mockRpc.mockResolvedValueOnce({});
    const ver = await getSifVersion();
    expect(ver.version).toBe("(versjon ikke tilgjengelig)");
  });

  it("calls SupportService/GetSIFVersion", async () => {
    mockRpc.mockResolvedValueOnce({ SIFVersion: "6.9.0" });
    await getSifVersion();
    expect(mockRpc).toHaveBeenCalledWith(
      "SupportService",
      "GetSIFVersion",
      {},
      undefined
    );
  });
});

// ── testSifConnection ─────────────────────────────────────────────────────────

describe("testSifConnection", () => {
  it("returns ok: true with version when call succeeds", async () => {
    mockRpc.mockResolvedValueOnce({ SIFVersion: "6.9.215" });
    const result = await testSifConnection();
    expect(result.ok).toBe(true);
    expect(result.version).toBe("6.9.215");
    expect(result.error).toBeUndefined();
  });

  it("returns ok: false with error message when RPC throws", async () => {
    mockRpc.mockRejectedValueOnce(new Error("connection refused"));
    const result = await testSifConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toContain("connection refused");
    expect(result.version).toBeUndefined();
  });

  it("handles non-Error throws and converts to string", async () => {
    mockRpc.mockRejectedValueOnce("plain string error");
    const result = await testSifConnection();
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plain string error");
  });
});
