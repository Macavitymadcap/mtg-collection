import type { NextFunction, Request, Response } from "express";
import { ValidateError } from "tsoa";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { errorHandler, notFoundHandler } from "./error-handler.js";
import { Conflict, Forbidden, NotFound, Unauthorized, UnprocessableEntity } from "./errors.js";

function run(error: unknown, headersSent = false) {
  const res = { headersSent, status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  const next = vi.fn();
  errorHandler(error, { method: "GET", path: "/x" } as Request, res as unknown as Response, next as NextFunction);
  const body = res.json.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
  return { status: res.status.mock.calls[0]?.[0] as number | undefined, body, next };
}

describe("errorHandler", () => {
  it("hides the details of unexpected errors behind a 500", () => {
    const { status, body } = run(new Error("connection string with a password in it"));
    expect(status).toBe(500);
    expect(body).toEqual({ name: "ApiError", message: "Internal server error" });
  });

  it("maps tsoa and Zod validation errors to 400 with field details", () => {
    const tsoa = run(new ValidateError({ "body.quantity": { message: "too small" } }, "Validation failed"));
    expect(tsoa).toMatchObject({
      status: 400,
      body: { message: "Validation failed", details: { "body.quantity": { message: "too small" } } },
    });

    const zod = run(z.object({ name: z.string() }).safeParse({ name: 1 }).error);
    expect(zod.status).toBe(400);
    expect(zod.body?.details).toHaveProperty("name");
  });

  it("maps MySQL duplicate-key errors to 409", () => {
    expect(run(Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" })).status).toBe(409);
  });

  it.each([
    [new Unauthorized(), 401, "Unauthorised"],
    [new Forbidden(), 403, "Forbidden"],
    [new NotFound(), 404, "Not found"],
    [new Conflict(), 409, "Conflict"],
    [new UnprocessableEntity(), 422, "Unprocessable entity"],
  ])("passes %s through with its status and default message", (error, status, message) => {
    expect(run(error)).toMatchObject({ status, body: { message } });
  });

  it("leaves responses that have already started to Express", () => {
    const error = new Error("late");
    const { status, next } = run(error, true);
    expect(status).toBeUndefined();
    expect(next).toHaveBeenCalledWith(error);
  });

  it("turns unmatched routes into a NotFound", () => {
    const next = vi.fn();
    notFoundHandler({ method: "POST", path: "/api/nope" } as Request, {} as Response, next);
    expect(next.mock.calls[0]?.[0]).toMatchObject({ status: 404, message: "No route for POST /api/nope" });
  });
});
