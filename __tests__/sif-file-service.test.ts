import { SifUploadError, SifValidationError } from "@/lib/sif/errors";
import { mimeTypeToFormat, uploadFileToSif } from "@/lib/sif/file-service";

// Mock the SIF RPC client
jest.mock("@/lib/sif/client", () => ({
  sifRpcCall: jest.fn(),
}));

import { sifRpcCall } from "@/lib/sif/client";

const mockSifRpcCall = sifRpcCall as jest.MockedFunction<typeof sifRpcCall>;

describe("uploadFileToSif", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("successfully uploads a file and returns FileReference", async () => {
    mockSifRpcCall.mockResolvedValueOnce({
      Successful: true,
      FileReference: "abc-123-file-ref",
    });

    const result = await uploadFileToSif({
      fileName: "rapport.pdf",
      fileData: Buffer.from("fake pdf content"),
      mimeType: "application/pdf",
    });

    expect(result.fileReference).toBe("abc-123-file-ref");
    expect(result.fileName).toBe("rapport.pdf");
    expect(mockSifRpcCall).toHaveBeenCalledWith(
      "FileService",
      "Upload",
      expect.objectContaining({
        FileName: "rapport.pdf",
        FileFormat: "pdf",
      }),
      undefined,
      true
    );
  });

  it("throws SifValidationError when filename has no extension", async () => {
    await expect(
      uploadFileToSif({
        fileName: "rapport",
        fileData: Buffer.from("data"),
      })
    ).rejects.toBeInstanceOf(SifValidationError);
    expect(mockSifRpcCall).not.toHaveBeenCalled();
  });

  it("throws SifValidationError when file exceeds 50MB", async () => {
    const bigBuffer = Buffer.alloc(51 * 1024 * 1024);
    await expect(
      uploadFileToSif({
        fileName: "huge.pdf",
        fileData: bigBuffer,
      })
    ).rejects.toBeInstanceOf(SifValidationError);
  });

  it("throws SifUploadError when Successful is false", async () => {
    mockSifRpcCall.mockResolvedValueOnce({
      Successful: false,
      ErrorMessage: "Storage quota exceeded",
    });

    await expect(
      uploadFileToSif({
        fileName: "rapport.pdf",
        fileData: Buffer.from("content"),
      })
    ).rejects.toBeInstanceOf(SifUploadError);
  });

  it("throws SifUploadError when FileReference is missing", async () => {
    mockSifRpcCall.mockResolvedValueOnce({
      Successful: true,
      FileReference: undefined,
    });

    await expect(
      uploadFileToSif({
        fileName: "rapport.pdf",
        fileData: Buffer.from("content"),
      })
    ).rejects.toBeInstanceOf(SifUploadError);
  });

  it("sends base64 encoded file data", async () => {
    const fileContent = "Hello PDF";
    mockSifRpcCall.mockResolvedValueOnce({
      Successful: true,
      FileReference: "ref-123",
    });

    await uploadFileToSif({
      fileName: "test.pdf",
      fileData: Buffer.from(fileContent),
    });

    const call = mockSifRpcCall.mock.calls[0];
    const payload = call[2] as { FileData: string };
    expect(Buffer.from(payload.FileData, "base64").toString()).toBe(fileContent);
  });
});

describe("mimeTypeToFormat", () => {
  it("maps application/pdf to pdf", () => {
    expect(mimeTypeToFormat("application/pdf")).toBe("pdf");
  });

  it("maps image/jpeg to jpg", () => {
    expect(mimeTypeToFormat("image/jpeg")).toBe("jpg");
  });

  it("maps image/png to png", () => {
    expect(mimeTypeToFormat("image/png")).toBe("png");
  });

  it("returns bin for unknown types", () => {
    expect(mimeTypeToFormat("application/octet-stream")).toBe("bin");
  });
});
