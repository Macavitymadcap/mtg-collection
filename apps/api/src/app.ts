import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import { AUTH_BASE_PATH, type Auth } from "./auth/better-auth.js";
import { loadSession } from "./auth/session.js";
import { signInForTests } from "./auth/test-sign-in.js";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./core/error-handler.js";
import { requestContext } from "./core/request-context.js";
import { requestLog } from "./core/request-log.js";
import { RegisterRoutes } from "./generated/routes.js";
import { container } from "./ioc.js";
import { TYPES } from "./types.js";

interface AppOptions {
  /** Adds routes before the API's own, e.g. Swagger UI for local development (see docs.ts). */
  extraRoutes?: (app: Express) => void;
}

/** Builds the Express app. Kept separate from listen() so tests and the Worker can use it. */
export function createApp({ extraRoutes }: AppOptions = {}): Express {
  const app = express();
  const auth = container.get<Auth>(TYPES.Auth);

  app.disable("x-powered-by");
  app.use(cors({ origin: config.CORS_ORIGINS }));
  // Sign-in, sign-out and session routes. Better Auth reads the body itself, so this comes before express.json.
  app.all(`${AUTH_BASE_PATH}/{*rest}`, toNodeHandler(auth));
  app.use(express.json({ limit: "25mb" })); // room for CSV imports and whole-database export files
  app.use(requestContext());
  app.use(loadSession(auth, config));
  app.use(requestLog());

  extraRoutes?.(app);

  if (config.NODE_ENV === "test") {
    app.post("/api/test/sign-in", signInForTests(auth));
  }

  RegisterRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
