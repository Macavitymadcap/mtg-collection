import type { Knex } from "knex";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./core/logger.js";
import { container } from "./ioc.js";
import { TYPES } from "./types.js";

const server = createApp().listen(config.PORT, () => {
  logger.info(`Listening on http://localhost:${config.PORT} (docs at /docs, health at /api/health)`);
});

// Keep idle connections open longer than a load balancer's 60 s idle timeout,
// so the balancer never reuses a socket Node has just closed.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);
  server.close(() => {
    void container
      .get<Knex>(TYPES.Knex)
      .destroy()
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // give up if requests hang
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
  process.exit(1);
});
