import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { AuthUser } from "../auth/types.js";

/** Per-request values available anywhere in the call chain. */
export interface RequestContext {
  correlationId: string;
  user?: AuthUser;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Express middleware that opens a context for each request. */
export function requestContext(): RequestHandler {
  return (req, res, next) => {
    const correlationId = req.get("x-correlation-id") ?? randomUUID();
    res.setHeader("x-correlation-id", correlationId);
    storage.run({ correlationId }, next);
  };
}

/** The current request's context, or undefined outside a request. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
