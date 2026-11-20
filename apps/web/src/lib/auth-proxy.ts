import "server-only";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

/** Request headers Better Auth needs: who's asking, from where, and their cookies. */
const REQUEST_HEADERS = ["cookie", "content-type", "origin", "referer", "user-agent", "x-forwarded-for"];
/** Response headers to pass back: cookies it sets, where to go next, and caching. */
const RESPONSE_HEADERS = ["set-cookie", "location", "content-type", "cache-control"];

/**
 * True for a browser opening the URL as a page (e.g. coming back from
 * GitHub), rather than the app fetching it in the background.
 */
function isPageLoad(request: Request): boolean {
  return request.method === "GET" && request.headers.get("sec-fetch-mode") === "navigate";
}

/** Sends a browser that opened an auth URL to the site's error page, rather than showing it JSON. */
function errorPage(request: Request, status: number): Response {
  return NextResponse.redirect(new URL(`/error?status=${status}`, request.url), 303);
}

/**
 * Passes sign-in, sign-out and session requests through to the API's Better
 * Auth routes as they are. The site and the API share the /api/auth path, so
 * the browser only ever sees the site, and the cookies are the site's.
 * Redirects (to GitHub, and back after signing in) go back to the browser.
 * Errors on pages the browser opened itself go to the error page.
 */
export async function proxyAuth(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const url = new URL(env.API_BASE_URL + incoming.pathname.slice("/api".length));
  url.search = incoming.search;

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    if (upstream.status >= 400 && isPageLoad(request)) return errorPage(request, upstream.status);

    const response = new NextResponse(upstream.body, { status: upstream.status });
    for (const name of RESPONSE_HEADERS) {
      if (name === "set-cookie") {
        for (const cookie of upstream.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
      } else {
        const value = upstream.headers.get(name);
        if (value) response.headers.set(name, value);
      }
    }
    return response;
  } catch {
    if (isPageLoad(request)) return errorPage(request, 502);
    return NextResponse.json({ name: "BadGateway", message: "Sign-in is unavailable" }, { status: 502 });
  }
}
