/**
 * Tests for SIF extensions/file-download.
 * @jest-environment node
 */

jest.mock("@/lib/sif/settings", () => ({
  loadSifSettingsWithEnvFallback: jest.fn().mockResolvedValue({
    baseUrl: "https://demo.example.com",
    authMode: "authkey",
    authkey: "test-key",
    rpcPath: "/rpc",
    timeoutMs: 30000,
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
  downloadFileByUrl,
  downloadSifFile,
  downloadSifFiles,
} from "@/lib/sif/extensions/file-download";

function makeResponse(bytes: Uint8Array, status = 200): Response {
  return new Response(bytes, { status });
}

const pdfBytes = new Uint8Array([37, 80, 68, 70]); // "%PDF"

beforeEach(() => {
  jest.clearAllMocks();
  // Ensure fetch is always a mock so assertions work even in tests that skip setup
  global.fetch = jest.fn();
});

// ── downloadFileByUrl ─────────────────────────────────────────────────────────

describe("downloadFileByUrl", () => {
  it("returns null immediately for an empty URL", async () => {
    const result = await downloadFileByUrl("", "file.pdf", "pdf");
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("downloads file and returns metadata on success", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(pdfBytes));
    const result = await downloadFileByUrl(
      "https://demo.example.com/file.pdf",
      "rapport.pdf",
      "PDF"
    );
    expect(result).not.toBeNull();
    expect(result?.fileName).toBe("rapport.pdf");
    expect(result?.format).toBe("pdf"); // lowercased
    expect(result?.size).toBe(4);
  });

  it("appends authkey as URL query param for authkey mode", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(pdfBytes));
    await downloadFileByUrl("https://demo.example.com/file.pdf", "f.pdf", "pdf");
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("authkey=test-key");
  });

  it("resolves relative URLs against the configured baseUrl", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(pdfBytes));
    await downloadFileByUrl("/Archive/file.pdf", "f.pdf", "pdf");
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(calledUrl).toContain("https://demo.example.com/Archive/file.pdf");
  });

  it("returns null when server responds with HTTP error", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(new Response("Forbidden", { status: 403 }));
    expect(await downloadFileByUrl("https://demo.example.com/file.pdf", "f.pdf", "pdf")).toBeNull();
  });

  it("returns null without throwing when fetch throws", async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error("AbortError"));
    expect(await downloadFileByUrl("https://demo.example.com/file.pdf", "f.pdf", "pdf")).toBeNull();
  });
});

// ── downloadSifFile ───────────────────────────────────────────────────────────

describe("downloadSifFile", () => {
  it("returns null when file has no URL", async () => {
    const result = await downloadSifFile({ URL: undefined, Title: "f.pdf", Format: "pdf" });
    expect(result).toBeNull();
  });

  it("delegates to downloadFileByUrl and returns result", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(pdfBytes));
    const result = await downloadSifFile({
      URL: "https://demo.example.com/file.pdf",
      Title: "rapport.pdf",
      Format: "pdf",
    });
    expect(result?.fileName).toBe("rapport.pdf");
  });

  it("uses 'unnamed' as fileName when Title is absent", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(pdfBytes));
    const result = await downloadSifFile({
      URL: "https://demo.example.com/file.pdf",
      Title: undefined,
      Format: "pdf",
    });
    expect(result?.fileName).toBe("unnamed");
  });
});

// ── downloadSifFiles ──────────────────────────────────────────────────────────

describe("downloadSifFiles", () => {
  it("downloads multiple files in parallel", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(makeResponse(pdfBytes))
      .mockResolvedValueOnce(makeResponse(pdfBytes));

    const files = [
      { URL: "https://demo.example.com/a.pdf", Title: "a.pdf", Format: "pdf" },
      { URL: "https://demo.example.com/b.pdf", Title: "b.pdf", Format: "pdf" },
    ];
    const results = await downloadSifFiles(files);
    expect(results).toHaveLength(2);
  });

  it("skips files without a URL", async () => {
    global.fetch = jest.fn().mockResolvedValueOnce(makeResponse(pdfBytes));
    const files = [
      { URL: "https://demo.example.com/a.pdf", Title: "a.pdf", Format: "pdf" },
      { URL: undefined, Title: "b.pdf", Format: "pdf" },
    ];
    const results = await downloadSifFiles(files);
    expect(results).toHaveLength(1);
  });

  it("silently skips files that fail to download", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(new Response("Error", { status: 500 }))
      .mockResolvedValueOnce(makeResponse(pdfBytes));

    const files = [
      { URL: "https://demo.example.com/a.pdf", Title: "a.pdf", Format: "pdf" },
      { URL: "https://demo.example.com/b.pdf", Title: "b.pdf", Format: "pdf" },
    ];
    const results = await downloadSifFiles(files);
    expect(results).toHaveLength(1);
    expect(results[0].fileName).toBe("b.pdf");
  });

  it("returns empty array for empty input", async () => {
    expect(await downloadSifFiles([])).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
