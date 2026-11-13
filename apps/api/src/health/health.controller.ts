import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { Controller, Get, Response, Route, Tags } from "tsoa";
import { TYPES } from "../types.js";

interface HealthStatus {
  status: "ok" | "degraded";
  database: "ok" | "unreachable";
}

/** Liveness and database reachability. No auth, for load balancers. */
@injectable()
@Route("health")
@Tags("Health")
export class HealthController extends Controller {
  constructor(@inject(TYPES.Knex) private readonly db: Knex) {
    super();
  }

  @Get()
  @Response<HealthStatus>(503, "Database unreachable")
  public async get(): Promise<HealthStatus> {
    try {
      await this.db.raw("select 1").timeout(2_000);
      return { status: "ok", database: "ok" };
    } catch {
      this.setStatus(503);
      return { status: "degraded", database: "unreachable" };
    }
  }
}
