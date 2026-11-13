import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/** Validated environment variables. Server-only values never reach the browser. */
export const env = createEnv({
  server: {
    API_BASE_URL: z.url(),
    API_JWT_SECRET: z.string().min(16),
  },
  client: {},
  runtimeEnv: {
    API_BASE_URL: process.env.API_BASE_URL,
    API_JWT_SECRET: process.env.API_JWT_SECRET,
  },
});
