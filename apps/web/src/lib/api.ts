import { up } from "up-fetch";

/** Fetcher for this app's /api routes (the BFF). */
export const api = up(fetch, () => ({
  baseUrl: "/api",
  timeout: 15_000,
}));
