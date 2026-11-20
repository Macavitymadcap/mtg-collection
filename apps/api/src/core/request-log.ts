import type { RequestHandler } from "express";
import { logger } from "./logger.js";

/**
 * Logs each request when its response finishes, in the format morgan used:
 * `GET /api/decks 200 1234 - 12.3 ms`. Morgan itself can't run on Workers
 * (it builds its formatter with `new Function`).
 */
export function requestLog(): RequestHandler {
  return (req, res, next) => {
    const start = performance.now();
    res.on("finish", () => {
      const length = res.getHeader("content-length") ?? "-";
      const ms = (performance.now() - start).toFixed(1);
      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${String(length)} - ${ms} ms`);
    });
    next();
  };
}
