import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";
import type { Config } from "../config.js";
import { logger } from "../core/logger.js";
import { getRequestContext } from "../core/request-context.js";
import { isAllowed, type Auth } from "./better-auth.js";

/**
 * Puts the signed-in person, if any, on the request context. Requests
 * without a session carry on as visitors: reads are public, changes need the
 * "editor" security scheme. Someone taken off the allowlist stops counting as
 * signed in straight away, even with a live session.
 */
export function loadSession(auth: Auth, config: Pick<Config, "AUTH_GITHUB_ALLOWLIST">): RequestHandler {
  return async (req, _res, next) => {
    const context = getRequestContext();
    if (!context || !req.headers.cookie) return next();
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      const login = session?.user.githubLogin;
      if (session && typeof login === "string" && isAllowed(config, login)) {
        context.session = { id: session.user.id, name: session.user.name, githubLogin: login };
      }
    } catch (error) {
      // A broken cookie or a database hiccup leaves the request signed out rather than failing it
      logger.warn("Couldn't read the session", { error });
    }
    next();
  };
}
