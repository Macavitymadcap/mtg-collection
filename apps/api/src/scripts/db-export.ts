import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Knex } from "knex";
import { DataService } from "../data/data.service.js";
import { container } from "../ioc.js";
import { TYPES } from "../types.js";

// npm run db:export -- [file.json]   (prints to stdout without a file)
// npm runs workspace scripts from apps/api; resolve paths from where the command was typed
const [arg] = process.argv.slice(2);
const path = arg ? resolve(process.env.INIT_CWD ?? process.cwd(), arg) : undefined;

try {
  const file = await container.get(DataService).export();
  const json = `${JSON.stringify(file, null, 2)}\n`;
  if (path) {
    await writeFile(path, json);
    console.error(`Exported ${file.collection.length} entries and ${file.decks.length} decks to ${path}`);
  } else {
    process.stdout.write(json);
  }
} finally {
  await container.get<Knex>(TYPES.Knex).destroy();
}
