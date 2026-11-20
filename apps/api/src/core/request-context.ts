import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type { Knex } from "knex";
import type { AuthUser, SessionUser } from "../auth/types.js";

/** Per-request values available anywhere in the call chain. */
export interface RequestContext {
  correlationId: string;
  /** Who passed the route's @Security check. */
  user?: AuthUser;
  /** The signed-in person, if the request has a valid session. */
  session?: SessionUser;
  /** This request's own database connection, when connections are per request (see db/database.ts). */
  db?: Knex;
  /** Run once the response has gone, e.g. to close this request's database connection. */
  cleanups: (() => Promise<void>)[];
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Express middleware that opens a context for each request. */
export function requestContext(): RequestHandler {
  return (req, res, next) => {
    const correlationId = req.get("x-correlation-id") ?? randomUUID();
    res.setHeader("x-correlation-id", correlationId);
    const context: RequestContext = { correlationId, cleanups: [] };
    res.once("close", () => {
      for (const cleanup of context.cleanups) void cleanup().catch(() => undefined);
    });
    storage.run(context, next);
  };
}

/** The current request's context, or undefined outside a request. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}
