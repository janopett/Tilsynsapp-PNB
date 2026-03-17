import {
  SifError,
  SifAuthenticationError,
  SifAuthorizationError,
  SifNotFoundError,
  SifRateLimitError,
  SifValidationError,
  SifCaseNotFoundError,
  SifMultipleCasesFoundError,
  SifUploadError,
  SifCreateDocumentError,
  SifTimeoutError,
  mapHttpErrorToSifError,
} from "@/lib/sif/errors";

describe("SIF Error Classes", () => {
  it("SifError has correct properties", () => {
    const err = new SifError("test error", "TEST_CODE", 500, { raw: true });
    expect(err.message).toBe("test error");
    expect(err.code).toBe("TEST_CODE");
    expect(err.httpStatus).toBe(500);
    expect(err.raw).toEqual({ raw: true });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(SifError);
  });

  it("SifAuthenticationError has correct code and status", () => {
    const err = new SifAuthenticationError();
    expect(err.code).toBe("SIF_AUTHENTICATION_ERROR");
    expect(err.httpStatus).toBe(401);
    expect(err.name).toBe("SifAuthenticationError");
  });

  it("SifAuthorizationError has correct code and status", () => {
    const err = new SifAuthorizationError();
    expect(err.code).toBe("SIF_AUTHORIZATION_ERROR");
    expect(err.httpStatus).toBe(403);
  });

  it("SifRateLimitError exposes retryAfterSeconds", () => {
    const err = new SifRateLimitError("rate limited", 30);
    expect(err.retryAfterSeconds).toBe(30);
    expect(err.httpStatus).toBe(429);
  });

  it("SifCaseNotFoundError includes criteria in message", () => {
    const err = new SifCaseNotFoundError("24/1234");
    expect(err.message).toContain("24/1234");
    expect(err.code).toBe("SIF_CASE_NOT_FOUND");
  });

  it("SifMultipleCasesFoundError includes count and criteria", () => {
    const err = new SifMultipleCasesFoundError(3, "test criteria");
    expect(err.message).toContain("3");
    expect(err.message).toContain("test criteria");
    expect(err.code).toBe("SIF_MULTIPLE_CASES_FOUND");
  });

  it("SifUploadError includes fileName in message", () => {
    const err = new SifUploadError("rapport.pdf", "Server error");
    expect(err.message).toContain("rapport.pdf");
    expect(err.message).toContain("Server error");
    expect(err.code).toBe("SIF_UPLOAD_ERROR");
  });

  it("SifTimeoutError includes timeout ms in message", () => {
    const err = new SifTimeoutError(30000);
    expect(err.message).toContain("30000");
    expect(err.code).toBe("SIF_TIMEOUT_ERROR");
  });
});

describe("mapHttpErrorToSifError", () => {
  it("maps 401 to SifAuthenticationError", () => {
    const err = mapHttpErrorToSifError(401, null, "test context");
    expect(err).toBeInstanceOf(SifAuthenticationError);
  });

  it("maps 403 to SifAuthorizationError", () => {
    const err = mapHttpErrorToSifError(403, null, "test context");
    expect(err).toBeInstanceOf(SifAuthorizationError);
  });

  it("maps 404 to SifNotFoundError", () => {
    const err = mapHttpErrorToSifError(404, null, "test context");
    expect(err).toBeInstanceOf(SifNotFoundError);
  });

  it("maps 429 to SifRateLimitError", () => {
    const err = mapHttpErrorToSifError(429, null, "test context");
    expect(err).toBeInstanceOf(SifRateLimitError);
  });

  it("extracts message from body.message", () => {
    const err = mapHttpErrorToSifError(500, { message: "custom error" }, "ctx");
    expect(err.message).toBe("custom error");
  });

  it("extracts message from body.Message (PascalCase)", () => {
    const err = mapHttpErrorToSifError(500, { Message: "PascalCase message" }, "ctx");
    expect(err.message).toBe("PascalCase message");
  });

  it("uses context as fallback when body has no message", () => {
    const err = mapHttpErrorToSifError(500, null, "FallbackContext");
    expect(err.message).toBe("FallbackContext");
  });

  it("extracts retryAfter from body for 429", () => {
    const err = mapHttpErrorToSifError(
      429,
      { RetryAfter: 60 },
      "rate limit"
    ) as SifRateLimitError;
    expect(err.retryAfterSeconds).toBe(60);
  });

  it("maps unknown status to generic SifError with HTTP code", () => {
    const err = mapHttpErrorToSifError(503, null, "unavailable");
    expect(err.code).toBe("SIF_HTTP_503");
    expect(err.httpStatus).toBe(503);
  });
});
