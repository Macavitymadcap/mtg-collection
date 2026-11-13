import { describe, expect, it } from "vitest";
import { routeId } from "./route-id";

describe("routeId", () => {
  it("returns positive whole numbers", () => {
    expect(routeId("42")).toBe(42);
  });

  it.each(["abc", "0", "-1", "1.5", ""])("shows the not-found page for %j", (value) => {
    expect(() => routeId(value)).toThrow("NEXT_NOT_FOUND");
  });
});
