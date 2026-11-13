import { ResponseError } from "up-fetch";
import { describe, expect, it } from "vitest";
import { errorMessage } from "./errors";

const responseError = (data: unknown) => new ResponseError({ message: "Request failed", status: 409, data });

describe("errorMessage", () => {
  it("uses the API's message when there is one", () => {
    expect(errorMessage(responseError({ name: "Conflict", message: "Used in Goblins." }))).toBe("Used in Goblins.");
  });

  it("falls back for other errors and bodies", () => {
    expect(errorMessage(responseError("plain text"), "Could not save")).toBe("Could not save");
    expect(errorMessage(responseError({ message: 42 }))).toBe("Something went wrong. Try again.");
    expect(errorMessage(new TypeError("Failed to fetch"))).toBe("Something went wrong. Try again.");
  });
});
