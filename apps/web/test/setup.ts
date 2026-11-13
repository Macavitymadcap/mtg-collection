import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { createElement, type AnchorHTMLAttributes, type ImgHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw";
import { router } from "./router";

// Fail any test that makes a request no handler covers (MSW 3 calls requests and messages "frames")
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// Next's Link, Image and router need the framework running. In tests they
// become a plain <a>, a plain <img> and spies.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    createElement("a", { href, ...props }, children),
}));

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    priority: _priority,
    ...props
  }: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => createElement("img", { src, alt, ...props }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

afterEach(() => vi.clearAllMocks());
