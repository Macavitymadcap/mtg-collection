import { httpServerHandler } from "cloudflare:node";

/** What the Worker is given: the Hyperdrive binding, plus vars and secrets. */
interface Env {
  HYPERDRIVE: { host: string; port: number; user: string; password: string; database: string };
}

const PORT = 8080;
const server = httpServerHandler({ port: PORT });
let started: Promise<void> | undefined;

/**
 * Loads the Express app on the first request. Workers don't allow I/O while
 * the module loads, and reading the Hyperdrive binding counts. The app reads
 * its settings from process.env when it loads, so the database settings are
 * pointed at Hyperdrive first: a local address with its own credentials,
 * which handles TLS to the real database.
 */
async function start(env: Env): Promise<void> {
  Object.assign(process.env, {
    DB_HOST: env.HYPERDRIVE.host,
    DB_PORT: String(env.HYPERDRIVE.port),
    DB_USER: env.HYPERDRIVE.user,
    DB_PASSWORD: env.HYPERDRIVE.password,
    DB_NAME: env.HYPERDRIVE.database,
  });
  const { createApp } = await import("../app.js");
  createApp().listen(PORT);
}

export default {
  async fetch(request: Request, env: Env, ctx: unknown): Promise<Response> {
    started ??= start(env);
    await started;
    return server.fetch(request, env, ctx);
  },
};
