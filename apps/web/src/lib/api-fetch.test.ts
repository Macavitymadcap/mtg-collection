// @vitest-environment node
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/msw";
import { apiFetch } from "./api-fetch";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
const context = vi.mocked(getCloudflareContext);

afterEach(() => context.mockReset());

describe("apiFetch", () => {
  it("goes through the API Worker's service binding on Cloudflare", async () => {
    const calls: string[] = [];
    const API = {
      fetch: (input: URL) => {
        calls.push(input.href);
        return Promise.resolve(Response.json({ via: "binding" }));
      },
    };
    context.mockReturnValue({ env: { API } } as unknown as ReturnType<typeof getCloudflareContext>);

    const response = await apiFetch(new URL("https://mtg-api.internal/api/decks"), { method: "GET" });

    expect(await response.json()).toEqual({ via: "binding" });
    expect(calls).toEqual(["https://mtg-api.internal/api/decks"]);
  });

  it("uses plain fetch anywhere else", async () => {
    context.mockImplementation(() => {
      throw new Error("not running on Cloudflare");
    });
    server.use(http.get("http://api.test/api/decks", () => HttpResponse.json({ via: "fetch" })));

    const response = await apiFetch(new URL("http://api.test/api/decks"), { method: "GET" });

    expect(await response.json()).toEqual({ via: "fetch" });
  });
});
