import cors from "cors";
import express, { type Express } from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { config } from "./config.js";
import { errorHandler, notFoundHandler } from "./core/error-handler.js";
import { logger } from "./core/logger.js";
import { requestContext } from "./core/request-context.js";
import { RegisterRoutes } from "./generated/routes.js";
import spec from "./generated/swagger.json" with { type: "json" };

/** Builds the Express app. Kept separate from listen() so tests can use it. */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(cors({ origin: config.CORS_ORIGINS }));
  app.use(express.json({ limit: "5mb" })); // room for CSV imports
  app.use(requestContext());
  app.use(
    morgan(":method :url :status :res[content-length] - :response-time ms", {
      stream: { write: (line) => logger.http(line.trim()) },
    }),
  );

  if (config.NODE_ENV !== "production") {
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  }

  RegisterRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
