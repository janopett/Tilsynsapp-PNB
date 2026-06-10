/**
 * Tests for the SIF RPC client.
 * Uses fetch mock to avoid real network calls.
 * @jest-environment node
 */

import type { SifClientConfig } from "@/lib/sif/client";
import { buildRpcUrl, sifRpcCallWithConfig } from "@/lib/sif/client";
import { SifAuthenticationError, SifRateLimitError, SifTimeoutError } from "@/lib/sif/errors";

// Mock auth to return predictable headers
jest.mock("@/lib/sif/auth", () => ({
  buildSifAuthHeaders: jest.fn().mockResolvedValue({ AuthKey: "test-key" }),
  maskAuthHeaders: jest.fn((h: Record<string, string>) => ({
    ...h,
    AuthKey: "***",
  })),
}));

const mockConfig: SifClientConfig = {
  baseUrl: "https://test.example.com",
  rpcPath: "/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC",
  timeoutMs: 5000,
};

function makeJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("buildRpcUrl", () => {
  it("builds the correct URL", () => {
    const url = buildRpcUrl(mockConfig, "CaseService", "GetCases");
    expect(url).toBe(
      "https://test.example.com/Biz/v2/api/call/SI.Data.RPC/SI.Data.RPC/CaseService/GetCases"
    );
  });
});

describe("sifRpcCallWithConfig", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Re-apply auth mock after reset
    const auth = require("@/lib/sif/auth");
    auth.buildSifAuthHeaders.mockResolvedValue({ AuthKey: "test-key" });
    auth.maskAuthHeaders.mockImplementation((h: Record<string, string>) => ({
      ...h,
      AuthKey: "***",
    }));
  });

  it("returns parsed JSON on success", async () => {
    const mockData = { CaseNumber: "24/1234", Recno: 100 };
    global.fetch = jest.fn().mockResolvedValueOnce(makeJsonResponse(mockData));

    const result = await sifRpcCallWithConfig(mockConfig, "CaseService", "GetCases", {
      CaseNumber: "24/1234",
    });

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("throws SifAuthenticationError on 401", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeJsonResponse({ message: "Unauthorized" }, 401));

    await expect(
      sifRpcCallWithConfig(mockConfig, "CaseService", "GetCases", {})
    ).rejects.toBeInstanceOf(SifAuthenticationError);
  });

  it("retries on 429 up to 3 times", async () => {
    // Simulate rate limit followed by success
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(makeJsonResponse({ success: true }));

    jest.useFakeTimers();
    const promise = sifRpcCallWithConfig(mockConfig, "CaseService", "GetCases", {});
    await jest.runAllTimersAsync();
    const result = await promise;
    jest.useRealTimers();

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("throws SifRateLimitError after 3 retries exhausted", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    );

    jest.useFakeTimers();
    const promise = sifRpcCallWithConfig(mockConfig, "CaseService", "GetCases", {});
    // Set up assertion before advancing timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toBeInstanceOf(SifRateLimitError);
    await jest.runAllTimersAsync();
    jest.useRealTimers();
    await assertion;
    // 1 original + 3 retries = 4 calls
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
