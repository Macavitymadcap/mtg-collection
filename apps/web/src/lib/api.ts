import { up } from "up-fetch";

/** Fetcher for this app's /api routes (the BFF). */
export const api = up(
  // Look fetch up on each call rather than capturing it now, so anything that
  // wraps the global later (e.g. MSW in tests) applies.
  (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
  () => ({
    // Absolute in the browser: up-fetch builds a Request, and outside a browser
    // (tests) Request can't resolve a relative URL. Same URL either way.
    baseUrl: typeof window === "undefined" ? "/api" : new URL("/api", window.location.origin).href,
    timeout: 15_000,
  }),
);
