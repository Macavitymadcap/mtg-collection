import winston from "winston";
import { config } from "../config.js";
import { getRequestContext } from "./request-context.js";

// Adds the correlation id and user to every log line written during a request.
const withRequestContext = winston.format((info) => {
  const context = getRequestContext();
  if (context) {
    info.correlationId = context.correlationId;
    if (context.user) info.userId = context.user.sub;
  }
  return info;
});

const isLocal = config.NODE_ENV === "local";

/** Application logger: readable locally, JSON elsewhere. */
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: winston.format.combine(
    withRequestContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isLocal ? winston.format.combine(winston.format.colorize(), winston.format.simple()) : winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});
