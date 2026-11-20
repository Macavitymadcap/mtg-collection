import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["local", "test", "development", "production"]).default("local"),
  PORT: z.coerce.number().int().default(3400),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().int().default(3306),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_POOL_MIN: z.coerce.number().int().default(2),
  DB_POOL_MAX: z.coerce.number().int().default(10),
  /**
   * The database server's CA certificate (PEM text). When set, connections use
   * TLS and check the server's certificate and host name against it. Hosted
   * databases need this; the local Docker MySQL doesn't.
   */
  /**
   * "pooled": one connection pool for the process (Node). "per-request": no
   * connection outlives its request, as Cloudflare Workers require (the
   * Worker sets this; Hyperdrive does the pooling there).
   */
  DB_CONNECTIONS: z.enum(["pooled", "per-request"]).default("pooled"),
  DB_SSL_CA: z
    .string()
    .optional()
    .transform((pem) => (pem ? pem.replace(/\\n/g, "\n") : undefined)),
  JWT_SECRET: z.string().min(16),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  SCRYFALL_BASE_URL: z.url().default("https://api.scryfall.com"),
  /** Scryfall requires a User-Agent that identifies the app. */
  SCRYFALL_USER_AGENT: z.string().min(1).default("mtg-collection/0.1 (personal collection manager)"),
  /** Source of preconstructed deck lists. */
  MTGJSON_BASE_URL: z.url().default("https://mtgjson.com/api/v5"),
  /** Signs session cookies. At least 32 random characters: `openssl rand -base64 32`. */
  AUTH_SECRET: z.string().min(32),
  /** The site's public origin (the web app), where sign-in callbacks and cookies live. */
  AUTH_BASE_URL: z.url().default("http://localhost:3000"),
  /** GitHub OAuth app. Without it, sign-in is off and the site is read-only. */
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  /** GitHub usernames allowed to sign in, comma-separated. Nobody else can create an account. */
  AUTH_GITHUB_ALLOWLIST: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((login) => login.trim().toLowerCase())
        .filter(Boolean),
    ),
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) => value.split(",").filter(Boolean)),
});

/** Validated application configuration. */
export type Config = z.infer<typeof schema>;

function loadConfig(): Config {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error(`Invalid environment:\n${z.prettifyError(result.error)}`);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
