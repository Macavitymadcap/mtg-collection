import { describe, expect, it } from "vitest";
import { parseJson } from "./data.service.js";

describe("parseJson", () => {
  it("parses JSON", () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("turns invalid JSON into a 400", () => {
    expect(() => parseJson("{nope")).toThrow(
      expect.objectContaining({ status: 400, message: expect.stringMatching(/^Not valid JSON/) }),
    );
  });
});
