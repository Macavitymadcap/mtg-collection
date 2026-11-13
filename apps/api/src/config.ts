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
  JWT_SECRET: z.string().min(16),
  LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
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
