/** An error that maps to an HTTP status and is safe to show the caller. */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.details = details;
  }
}

export class BadRequest extends ApiError {
  constructor(message = "Bad request", details?: unknown) {
    super(400, message, details);
  }
}

export class Unauthorized extends ApiError {
  constructor(message = "Unauthorised") {
    super(401, message);
  }
}

export class Forbidden extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message);
  }
}

export class NotFound extends ApiError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class Conflict extends ApiError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

export class UnprocessableEntity extends ApiError {
  constructor(message = "Unprocessable entity", details?: unknown) {
    super(422, message, details);
  }
}

/** An upstream service failed or returned something unexpected. */
export class BadGateway extends ApiError {
  constructor(message = "Bad gateway") {
    super(502, message);
  }
}
