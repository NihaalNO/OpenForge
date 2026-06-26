export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Authentication is required") {
    super(401, "unauthorized", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Resource was not found", code = "not_found") {
    super(404, code, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string, code = "conflict") {
    super(409, code, message);
  }
}

export class RateLimitError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(429, "github_rate_limited", message, details);
  }
}

export class ExternalServiceError extends HttpError {
  constructor(message: string, code = "external_service_error", details?: Record<string, unknown>) {
    super(502, code, message, details);
  }
}

export class ConfigurationError extends HttpError {
  constructor(message: string) {
    super(500, "configuration_error", message);
  }
}
