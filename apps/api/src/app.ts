import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { AUTH_BASE_PATH, type Auth } from "./auth/better-auth.js";
import { loadSession } from "./auth/session.js";
import { signInForTests } from "./auth/test-sign-in.js";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./core/error-handler.js";
import { logger } from "./core/logger.js";
import { requestContext } from "./core/request-context.js";
import { RegisterRoutes } from "./generated/routes.js";
import { container } from "./ioc.js";
import spec from "./generated/swagger.json" with { type: "json" };
import { TYPES } from "./types.js";

/** Builds the Express app. Kept separate from listen() so tests can use it. */
export function createApp(): Express {
  const app = express();
  const auth = container.get<Auth>(TYPES.Auth);

  app.disable("x-powered-by");
  app.use(cors({ origin: config.CORS_ORIGINS }));
  // Sign-in, sign-out and session routes. Better Auth reads the body itself, so this comes before express.json.
  app.all(`${AUTH_BASE_PATH}/{*rest}`, toNodeHandler(auth));
  app.use(express.json({ limit: "25mb" })); // room for CSV imports and whole-database export files
  app.use(requestContext());
  app.use(loadSession(auth, config));
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: { write: (line) => logger.http(line.trim()) },
    }),
  );

  if (config.NODE_ENV !== "production") {
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  if (config.NODE_ENV === "test") {
    app.post("/api/test/sign-in", signInForTests(auth));
  }

  RegisterRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
