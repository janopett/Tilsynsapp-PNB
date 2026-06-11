/**
 * Tests for SIF extensions/referred-cases.
 * @jest-environment node
 */

jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

import {
  getReferringCases,
  getDocumentsWithFiles,
  filterDocumentsByStatus,
  filterFilesByStatusCode,
  getReferredCasesWithDocuments,
} from "@/lib/sif/extensions/referred-cases";
import { sifRpcCall } from "@/lib/sif/client";

const mockRpc = sifRpcCall as jest.Mock;

const rawCase = {
  Recno: 100,
  CaseNumber: "25/100",
  Title: "Testgate 1 tilsyn",
  ReferringCases: [
    { CaseNumber: "BYGG-25/388", Title: "Byggesak", Relation: "Referanse", Notes: "Test" },
  ],
};

const rawDoc = {
  Recno: 1,
  DocumentNumber: "25/100-1",
  Title: "Tilsynsrapport",
  Status: "J",
  Files: [
    { Recno: 10, URL: "/Archive/file.pdf", Title: "rapport.pdf", Format: "pdf", StatusCode: "J" },
  ],
};

beforeEach(() => {
  mockRpc.mockReset();
});

// ── getReferringCases ────────────────────────────────────────────────────────

describe("getReferringCases", () => {
  it("returns mapped referring cases", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [rawCase] });
    const cases = await getReferringCases("25/100");
    expect(cases).toHaveLength(1);
    expect(cases[0].caseNumber).toBe("BYGG-25/388");
    expect(cases[0].relation).toBe("Referanse");
    expect(cases[0].notes).toBe("Test");
  });

  it("returns empty array when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false });
    expect(await getReferringCases("25/100")).toEqual([]);
  });

  it("returns empty array when Cases is empty", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [] });
    expect(await getReferringCases("25/100")).toEqual([]);
  });

  it("returns empty array when ReferringCases is absent on the case", async () => {
    mockRpc.mockResolvedValueOnce({
      Successful: true,
      Cases: [{ ...rawCase, ReferringCases: null }],
    });
    expect(await getReferringCases("25/100")).toEqual([]);
  });

  it("sets notes to undefined when Notes is empty string", async () => {
    const caseWithEmptyNotes = {
      ...rawCase,
      ReferringCases: [{ CaseNumber: "X/1", Title: "T", Relation: "R", Notes: "" }],
    };
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [caseWithEmptyNotes] });
    const cases = await getReferringCases("25/100");
    expect(cases[0].notes).toBeUndefined();
  });
});

// ── getDocumentsWithFiles ────────────────────────────────────────────────────

describe("getDocumentsWithFiles", () => {
  it("returns documents with embedded files array", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Documents: [rawDoc] });
    const docs = await getDocumentsWithFiles("25/100");
    expect(docs).toHaveLength(1);
    expect(docs[0].files).toHaveLength(1);
    expect(docs[0].files[0].URL).toBe("/Archive/file.pdf");
  });

  it("uses empty array for files when Files is absent on a document", async () => {
    const docNoFiles = { ...rawDoc, Files: undefined };
    mockRpc.mockResolvedValueOnce({ Successful: true, Documents: [docNoFiles] });
    const docs = await getDocumentsWithFiles("25/100");
    expect(docs[0].files).toEqual([]);
  });

  it("returns empty array when Successful is false", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: false });
    expect(await getDocumentsWithFiles("25/100")).toEqual([]);
  });

  it("passes maxDocuments limit to RPC", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Documents: [] });
    await getDocumentsWithFiles("25/100", 10);
    expect(mockRpc).toHaveBeenCalledWith(
      "DocumentService",
      "GetDocuments",
      expect.objectContaining({ MaxReturnedDocuments: 10 }),
      undefined
    );
  });
});

// ── filterDocumentsByStatus ──────────────────────────────────────────────────

describe("filterDocumentsByStatus", () => {
  const docsWithFiles = [
    { ...rawDoc, files: rawDoc.Files },
    { ...rawDoc, Recno: 2, Status: "F", files: rawDoc.Files },
  ];

  it("returns only documents matching the given status", () => {
    const result = filterDocumentsByStatus(docsWithFiles as any, "J");
    expect(result).toHaveLength(1);
    expect(result[0].Recno).toBe(1);
  });

  it("returns empty array when no documents match", () => {
    expect(filterDocumentsByStatus(docsWithFiles as any, "X")).toEqual([]);
  });
});

// ── filterFilesByStatusCode ──────────────────────────────────────────────────

describe("filterFilesByStatusCode", () => {
  const docsWithMixedFiles = [
    {
      ...rawDoc,
      files: [
        { URL: "/file1.pdf", StatusCode: "J" },
        { URL: "/file2.pdf", StatusCode: "F" },
      ],
    },
    {
      ...rawDoc,
      Recno: 2,
      files: [{ URL: "/file3.pdf", StatusCode: "F" }],
    },
  ];

  it("keeps only files matching the given status code", () => {
    const result = filterFilesByStatusCode(docsWithMixedFiles as any, "J");
    expect(result).toHaveLength(1);
    expect(result[0].files).toHaveLength(1);
    expect(result[0].files[0].URL).toBe("/file1.pdf");
  });

  it("excludes documents that have no matching files", () => {
    const result = filterFilesByStatusCode(docsWithMixedFiles as any, "X");
    expect(result).toEqual([]);
  });
});

// ── getReferredCasesWithDocuments ────────────────────────────────────────────

describe("getReferredCasesWithDocuments", () => {
  it("returns empty array when no referring cases found", async () => {
    mockRpc.mockResolvedValueOnce({ Successful: true, Cases: [] });
    expect(await getReferredCasesWithDocuments("25/100")).toEqual([]);
  });

  it("fetches documents for each referring case", async () => {
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Cases: [rawCase] }) // getReferringCases
      .mockResolvedValueOnce({ Successful: true, Documents: [rawDoc] }); // getDocumentsWithFiles

    const result = await getReferredCasesWithDocuments("25/100");
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("BYGG-25/388");
    expect(result[0].documents).toHaveLength(1);
  });

  it("skips referring cases whose document fetch fails", async () => {
    const twoReferring = {
      ...rawCase,
      ReferringCases: [
        { CaseNumber: "A/1", Title: "A", Relation: "R" },
        { CaseNumber: "B/2", Title: "B", Relation: "R" },
      ],
    };
    mockRpc
      .mockResolvedValueOnce({ Successful: true, Cases: [twoReferring] })
      .mockRejectedValueOnce(new Error("network error")) // A/1 fails
      .mockResolvedValueOnce({ Successful: true, Documents: [rawDoc] }); // B/2 succeeds

    const result = await getReferredCasesWithDocuments("25/100");
    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("B/2");
  });
});
