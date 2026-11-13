import { vi } from "vitest";

/** The mocked Next router (see setup.ts). Assert on its spies, e.g. router.push. */
export const router = { push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn(), prefetch: vi.fn() };
