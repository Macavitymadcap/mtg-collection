import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import spec from "./generated/swagger.json" with { type: "json" };

/**
 * Swagger UI at /docs. Only the local Node server adds it: Swagger UI reads
 * its files from disk, which a Worker can't, and production doesn't need it.
 */
export function addDocs(app: Express): void {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
}
