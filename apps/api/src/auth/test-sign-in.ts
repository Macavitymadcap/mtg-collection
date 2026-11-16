import { testUtils, type TestHelpers } from "better-auth/plugins";
import type { Request, RequestHandler } from "express";
import type { Auth } from "./better-auth.js";
import { expressAuthentication } from "./authentication.js";

/** The plugin behind signInForTests. Only added to the auth instance when NODE_ENV is "test". */
export const testSignInPlugin = testUtils;

/** The GitHub login browser tests sign in as. Must be on AUTH_GITHUB_ALLOWLIST in .env.test. */
export const TEST_LOGIN = "allowed-tester";

/**
 * POST /api/test/sign-in, for browser tests only: signs in as TEST_LOGIN
 * without going to GitHub, and returns the session cookies for the browser.
 * Mounted only when NODE_ENV is "test", and still needs a token with the
 * data:admin scope.
 */
export function signInForTests(auth: Auth): RequestHandler {
  return async (req: Request, res, next) => {
    try {
      await expressAuthentication(req, "jwt", ["data:admin"]);
      // Added as a plain plugin, so TypeScript can't see the helpers it adds
      const { test, internalAdapter } = (await auth.$context) as unknown as {
        test: TestHelpers;
        internalAdapter: { findUserByEmail(email: string): Promise<{ user: { id: string } } | null> };
      };
      const email = `${TEST_LOGIN}@example.com`;
      const existing = await internalAdapter.findUserByEmail(email);
      const user =
        existing?.user ?? (await test.saveUser(test.createUser({ email, name: "Tester", githubLogin: TEST_LOGIN })));
      // The browser's site, so the cookies are set for it
      const origin = typeof req.query.origin === "string" ? req.query.origin : "http://localhost";
      const domain = new URL(origin).hostname;
      res.json(await test.getCookies({ userId: user.id, domain }));
    } catch (error) {
      next(error);
    }
  };
}
