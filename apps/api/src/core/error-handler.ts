import type { ErrorRequestHandler, RequestHandler } from "express";
import { ValidateError } from "tsoa";
import { z, ZodError } from "zod";
import { ApiError, BadRequest, Conflict, NotFound } from "./errors.js";
import { logger } from "./logger.js";

interface ErrorBody {
  name: string;
  message: string;
  details?: unknown;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}

/** Converts anything thrown into an ApiError. Unknown errors become a 500. */
function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ValidateError) return new BadRequest("Validation failed", error.fields);
  if (error instanceof ZodError) return new BadRequest("Validation failed", z.flattenError(error).fieldErrors);
  if (isDuplicateKey(error)) return new Conflict("A record with those values already exists");
  return new ApiError(500, "Internal server error");
}

/** 404 for any request no route matched. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFound(`No route for ${req.method} ${req.path}`));
};

/** The single place errors become HTTP responses. Register last. */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const apiError = toApiError(error);
  const isServerError = apiError.status >= 500;

  logger.log(isServerError ? "error" : "warn", apiError.message, {
    status: apiError.status,
    method: req.method,
    path: req.path,
    // Stack traces only for server errors; 4xx are the caller's mistake
    ...(isServerError && { error: error instanceof Error ? error.stack : error }),
  });

  const body: ErrorBody = { name: apiError.name, message: apiError.message };
  if (!isServerError && apiError.details !== undefined) body.details = apiError.details;

  res.status(apiError.status).json(body);
};
