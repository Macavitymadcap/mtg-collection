import { ResponseError } from "up-fetch";
import { describe, expect, it } from "vitest";
import { makeQueryClient } from "./query-client";

const retry = makeQueryClient().getDefaultOptions().queries?.retry as (count: number, error: unknown) => boolean;
const failure = (status: number) => new ResponseError({ message: "failed", status, data: null });

describe("makeQueryClient", () => {
  it("doesn't retry 4xx responses, which won't change", () => {
    expect(retry(0, failure(404))).toBe(false);
    expect(retry(0, failure(422))).toBe(false);
  });

  it("retries server and network errors twice", () => {
    expect(retry(0, failure(502))).toBe(true);
    expect(retry(1, new TypeError("Failed to fetch"))).toBe(true);
    expect(retry(2, failure(500))).toBe(false);
  });
});
