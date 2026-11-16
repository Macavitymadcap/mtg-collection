import "server-only";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { env } from "@/lib/env";

/**
 * The BFF's own token only reads. Changes need the person's session, which
 * comes from their cookie, so signed-out visitors can only look.
 */
const SCOPES = "cards:read";

/** A short-lived token the BFF uses to call the API. */
function serviceToken(): string {
  return jwt.sign({ scope: SCOPES }, env.API_JWT_SECRET, { subject: "web-bff", expiresIn: "5m" });
}

interface ForwardOptions {
  /** API path after /api, e.g. "/collection". */
  path: string;
  /** Validates the JSON body before forwarding. Invalid bodies get a 400 here. */
  bodySchema?: z.ZodType;
}

/**
 * Forwards a browser request to the API with credentials added, and passes
 * the API's status and JSON body back. The API's errors are already safe to
 * show (it hides 5xx details), so they're returned as they are.
 */
function cookieHeader(request: Request): { Cookie?: string } {
  const cookie = request.headers.get("cookie");
  return cookie ? { Cookie: cookie } : {};
}

export async function forward(request: Request, { path, bodySchema }: ForwardOptions): Promise<NextResponse> {
  const url = new URL(env.API_BASE_URL + path);
  url.search = new URL(request.url).search;

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const json: unknown = await request.json().catch(() => undefined);
    if (bodySchema) {
      const parsed = bodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { name: "BadRequest", message: "Validation failed", details: parsed.error.issues },
          { status: 400 },
        );
      }
    }
    body = json === undefined ? undefined : JSON.stringify(json);
  }

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers: {
        Authorization: `Bearer ${serviceToken()}`,
        "Content-Type": "application/json",
        "x-correlation-id": request.headers.get("x-correlation-id") ?? crypto.randomUUID(),
        // The session cookie: the API decides who is signed in
        ...cookieHeader(request),
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });

    if (upstream.status === 204) return new NextResponse(null, { status: 204 });
    const data: unknown = await upstream.json().catch(() => null);
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ name: "BadGateway", message: "The API is unavailable" }, { status: 502 });
  }
}
