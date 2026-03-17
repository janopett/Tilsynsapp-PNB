// ============================================================
// SIF Domain Errors
// ============================================================

export class SifError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus?: number,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "SifError";
  }
}

export class SifAuthenticationError extends SifError {
  constructor(message = "SIF authentication failed", raw?: unknown) {
    super(message, "SIF_AUTHENTICATION_ERROR", 401, raw);
    this.name = "SifAuthenticationError";
  }
}

export class SifAuthorizationError extends SifError {
  constructor(message = "SIF request not authorized", raw?: unknown) {
    super(message, "SIF_AUTHORIZATION_ERROR", 403, raw);
    this.name = "SifAuthorizationError";
  }
}

export class SifNotFoundError extends SifError {
  constructor(message = "SIF resource not found", raw?: unknown) {
    super(message, "SIF_NOT_FOUND_ERROR", 404, raw);
    this.name = "SifNotFoundError";
  }
}

export class SifRateLimitError extends SifError {
  constructor(
    message = "SIF rate limit exceeded",
    public readonly retryAfterSeconds?: number,
    raw?: unknown
  ) {
    super(message, "SIF_RATE_LIMIT_ERROR", 429, raw);
    this.name = "SifRateLimitError";
  }
}

export class SifValidationError extends SifError {
  constructor(message: string, raw?: unknown) {
    super(message, "SIF_VALIDATION_ERROR", 400, raw);
    this.name = "SifValidationError";
  }
}

export class SifCaseNotFoundError extends SifError {
  constructor(criteria: string, raw?: unknown) {
    super(`No SIF case found for criteria: ${criteria}`, "SIF_CASE_NOT_FOUND", 404, raw);
    this.name = "SifCaseNotFoundError";
  }
}

export class SifMultipleCasesFoundError extends SifError {
  constructor(count: number, criteria: string, raw?: unknown) {
    super(
      `Multiple SIF cases (${count}) found for criteria: ${criteria}. Please narrow the search.`,
      "SIF_MULTIPLE_CASES_FOUND",
      409,
      raw
    );
    this.name = "SifMultipleCasesFoundError";
  }
}

export class SifUploadError extends SifError {
  constructor(fileName: string, message: string, raw?: unknown) {
    super(`Failed to upload file "${fileName}": ${message}`, "SIF_UPLOAD_ERROR", undefined, raw);
    this.name = "SifUploadError";
  }
}

export class SifCreateDocumentError extends SifError {
  constructor(message: string, raw?: unknown) {
    super(`Failed to create SIF document: ${message}`, "SIF_CREATE_DOCUMENT_ERROR", undefined, raw);
    this.name = "SifCreateDocumentError";
  }
}

export class SifTimeoutError extends SifError {
  constructor(timeoutMs: number) {
    super(`SIF request timed out after ${timeoutMs}ms`, "SIF_TIMEOUT_ERROR");
    this.name = "SifTimeoutError";
  }
}

// Helper: map HTTP status to domain error
export function mapHttpErrorToSifError(
  status: number,
  body: unknown,
  context: string
): SifError {
  const message = extractErrorMessage(body, context);
  switch (status) {
    case 401:
      return new SifAuthenticationError(message, body);
    case 403:
      return new SifAuthorizationError(message, body);
    case 404:
      return new SifNotFoundError(message, body);
    case 409:
      return new SifError(message, "SIF_CONFLICT", 409, body);
    case 429: {
      const retryAfter = extractRetryAfter(body);
      return new SifRateLimitError(message, retryAfter, body);
    }
    default:
      return new SifError(message, `SIF_HTTP_${status}`, status, body);
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string") return body;
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.message === "string") return b.message;
    if (typeof b.error === "string") return b.error;
    if (typeof b.Message === "string") return b.Message;
    if (typeof b.Error === "string") return b.Error;
  }
  return fallback;
}

function extractRetryAfter(body: unknown): number | undefined {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (typeof b.retryAfter === "number") return b.retryAfter;
    if (typeof b.RetryAfter === "number") return b.RetryAfter;
  }
  return undefined;
}
