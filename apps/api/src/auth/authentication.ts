import type { Request } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { Forbidden, Unauthorized } from "../core/errors.js";
import { getRequestContext } from "../core/request-context.js";
import type { AuthUser } from "./types.js";

/**
 * Called by tsoa's generated routes for every @Security decorator.
 * Resolve to allow the request; throw to reject it.
 */
// tsoa expects a promise; being async also turns the throws below into rejections
// eslint-disable-next-line @typescript-eslint/require-await
export async function expressAuthentication(
  request: Request,
  securityName: string,
  scopes: string[] = [],
): Promise<AuthUser> {
  if (securityName !== "jwt") throw new Unauthorized(`Unknown security scheme ${securityName}`);

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

  const context = getRequestContext();
  if (context) context.user = user;

  return user; // tsoa puts this on request.user
}
