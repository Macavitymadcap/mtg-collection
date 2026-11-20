import { describe, expect, it } from "vitest";
import { describeError } from "./error-codes";

describe("describeError", () => {
  it.each([
    ["unable_to_create_user", undefined, "Not allowed to sign in", false],
    ["unable_to_create_session", undefined, "Not allowed to sign in", false],
    ["access_denied", undefined, "Sign-in cancelled", true],
    ["state_not_found", undefined, "Sign-in expired", true],
    ["state_mismatch", undefined, "Sign-in expired", true],
    ["invalid_code", undefined, "Couldn't sign in with GitHub", true],
    ["email_not_found", undefined, "No email on your GitHub account", false],
    [null, 502, "Something's down", false],
    [undefined, 500, "Something's down", false],
    ["something_new", undefined, "Something went wrong", false],
    [null, 404, "Something went wrong", false],
  ])("describes %s (status %s) as %s", (code, status, title, signInAgain) => {
    expect(describeError(code, status)).toMatchObject({ title, signInAgain });
  });
});
