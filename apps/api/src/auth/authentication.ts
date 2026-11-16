import type { Request } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { Forbidden, Unauthorized } from "../core/errors.js";
import { getRequestContext } from "../core/request-context.js";
import { EDITOR_SCOPES, type AuthUser } from "./types.js";

/**
 * Called by tsoa's generated routes for every @Security decorator.
 * Resolve to allow the request; throw to reject it.
 *
 * - "jwt": a service token (the web app's BFF, scripts) with the given scopes.
 * - "editor": a signed-in person, or a service token with the given scopes.
 */
// tsoa expects a promise; being async also turns the throws below into rejections
// eslint-disable-next-line @typescript-eslint/require-await
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes: string[] = [],
): Promise<AuthUser> {
  const context = getRequestContext();
  let user: AuthUser;

  if (securityName === "jwt") {
    user = verifyToken(request, scopes);
  } else if (securityName === "editor") {
    if (context?.session) {
      user = { sub: `github:${context.session.githubLogin}`, scopes: EDITOR_SCOPES };
    } else {
      try {
        user = verifyToken(request, scopes);
      } catch (error) {
        // The BFF's own token only reads: without a session, changes need signing in
        if (error instanceof Forbidden || !request.headers.authorization) {
          throw new Unauthorized("Sign in to make changes");
        }
        throw error;
      }
    }
  } else {
    throw new Unauthorized(`Unknown security scheme ${securityName}`);
  }

  if (context) context.user = user;
  return user; // tsoa puts this on request.user
}

function verifyToken(request: Request, scopes: string[]): AuthUser {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new Unauthorized("Missing bearer token");

  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(header.slice("Bearer ".length), config.JWT_SECRET, { algorithms: ["HS256"] });
    if (typeof decoded === "string") throw new Error("Unexpected string payload");
    payload = decoded;
  } catch {
    throw new Unauthorized("Invalid or expired token");
  }

  const user: AuthUser = {
    sub: payload.sub ?? "unknown",
    scopes: typeof payload.scope === "string" ? payload.scope.split(" ") : [],
  };
  if (!scopes.every((scope) => user.scopes.includes(scope))) {
    throw new Forbidden(`Requires scope: ${scopes.join(", ")}`);
  }
  return user;
}
