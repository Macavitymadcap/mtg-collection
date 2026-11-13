import { inject, injectable } from "inversify";
import type { Knex } from "knex";
import { TYPES } from "../types.js";

/** Runs work in a transaction, joining the caller's one if given. */
@injectable()
export class TransactionManager {
  constructor(@inject(TYPES.Knex) private readonly db: Knex) {}

  run<T>(work: (trx: Knex.Transaction) => Promise<T>, outer?: Knex.Transaction): Promise<T> {
    // knex.transaction commits when work resolves and rolls back when it throws
    return outer ? work(outer) : this.db.transaction(work);
  }
}
