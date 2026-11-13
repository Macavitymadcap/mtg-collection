import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { DataCounts } from "@mtg/shared";
import type { Knex } from "knex";
import { ApiError } from "../core/errors.js";
import { DataService, parseJson } from "../data/data.service.js";
import { container } from "../ioc.js";
import { TYPES } from "../types.js";

// npm run db:import -- file.json [--yes]
// Without --yes it only checks the file and shows what would change.
const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith("--"));
// npm runs workspace scripts from apps/api; resolve paths from where the command was typed
const path = fileArg ? resolve(process.env.INIT_CWD ?? process.cwd(), fileArg) : undefined;
const confirmed = args.includes("--yes");

const describe = (counts: DataCounts): string =>
  `${counts.entries} entries (${counts.copies} copies of ${counts.cards} cards), ${counts.decks} decks`;

if (!path) {
  console.error("Usage: npm run db:import -- file.json [--yes]");
  process.exit(1);
}

try {
  const input = parseJson(await readFile(path, "utf8"));
  const summary = await container.get(DataService).import(input, !confirmed);
  if (confirmed) {
    console.log(`Replaced ${describe(summary.replaced)}\n    with ${describe(summary.incoming)}.`);
  } else {
    console.log(`The file is valid. Importing it would delete ${describe(summary.replaced)}`);
    console.log(`and load ${describe(summary.incoming)}.`);
    console.log("Run again with --yes to do it.");
  }
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message);
    if (Array.isArray(error.details)) for (const detail of error.details) console.error(" ", JSON.stringify(detail));
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await container.get<Knex>(TYPES.Knex).destroy();
}
