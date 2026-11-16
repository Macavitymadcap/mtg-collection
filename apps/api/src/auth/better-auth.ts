import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { APIError } from "better-auth/api";
import { MysqlDialect } from "kysely";
import { createPool } from "mysql2";
import type { Config } from "../config.js";

/** Where Better Auth's routes are served, on the API and (through the BFF) on the site. */
export const AUTH_BASE_PATH = "/api/auth";

/** True if a GitHub login may sign in. Logins are compared case-insensitively. */
export function isAllowed(config: Pick<Config, "AUTH_GITHUB_ALLOWLIST">, login: unknown): boolean {
  return typeof login === "string" && config.AUTH_GITHUB_ALLOWLIST.includes(login.toLowerCase());
}

/**
 * Sign-in with GitHub, limited to the logins in AUTH_GITHUB_ALLOWLIST. There
 * is no sign-up: anyone else is turned away before a user is created. Users,
 * sessions and linked accounts live in the auth_* tables.
 */
export function createAuth(config: Config, plugins: BetterAuthPlugin[] = []) {
  const pool = createPool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    timezone: "Z",
    connectionLimit: 5,
  });

  const github =
    config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: config.GITHUB_CLIENT_ID,
            clientSecret: config.GITHUB_CLIENT_SECRET,
            // Only the profile is needed: the login is what the allowlist checks
            scope: ["read:user"],
            mapProfileToUser: (profile: { login: string }) => ({ githubLogin: profile.login }),
          },
        }
      : undefined;

  const auth = betterAuth({
    appName: "MTG Collection",
    baseURL: config.AUTH_BASE_URL,
    basePath: AUTH_BASE_PATH,
    secret: config.AUTH_SECRET,
    trustedOrigins: [config.AUTH_BASE_URL],
    database: { dialect: new MysqlDialect({ pool }), type: "mysql" },
    emailAndPassword: { enabled: false },
    socialProviders: github,
    user: {
      modelName: "auth_user",
      additionalFields: { githubLogin: { type: "string", required: false, input: false } },
    },
    session: {
      modelName: "auth_session",
      // Checks the session in the database at most every 5 minutes, rather than on every request
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    account: { modelName: "auth_account" },
    verification: { modelName: "auth_verification" },
    advanced: { cookiePrefix: "mtg" },
    databaseHooks: {
      user: {
        create: {
          // eslint-disable-next-line @typescript-eslint/require-await -- Better Auth expects a promise
          before: async (user) => {
            if (!isAllowed(config, user.githubLogin)) {
              throw new APIError("FORBIDDEN", { message: "This GitHub account isn't allowed to sign in" });
            }
          },
        },
      },
      session: {
        create: {
          // Also turns away existing users who have since been taken off the allowlist
          before: async (session) => {
            // From the auth's own context: the hook's context argument is null outside HTTP requests
            const { internalAdapter } = await auth.$context;
            const user = (await internalAdapter.findUserById(session.userId)) as {
              githubLogin?: unknown;
            } | null;
            if (!isAllowed(config, user?.githubLogin)) {
              throw new APIError("FORBIDDEN", { message: "This GitHub account isn't allowed to sign in" });
            }
          },
        },
      },
    },
    plugins,
  });
  return auth;
}

export type Auth = ReturnType<typeof createAuth>;
