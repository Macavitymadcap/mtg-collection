import { readFileSync, writeFileSync } from "node:fs";
import { applyEdits, modify } from "jsonc-parser";

/**
 * Writes the Hyperdrive config's id (a Pulumi output) into the API Worker's
 * wrangler.jsonc, keeping its comments. CI runs it between `pulumi up` and
 * deploying. Usage: tsx infra/scripts/sync-wrangler.ts <hyperdrive id>
 */
const [hyperdriveId] = process.argv.slice(2);
if (!hyperdriveId || !/^[0-9a-f]{32}$/.test(hyperdriveId)) {
  console.error("Usage: sync-wrangler.ts <hyperdrive id (32 hex characters)>");
  process.exit(1);
}

const path = "apps/api/wrangler.jsonc";
const text = readFileSync(path, "utf8");
const edits = modify(text, ["hyperdrive", 0, "id"], hyperdriveId, {
  formattingOptions: { tabSize: 2, insertSpaces: true },
});
writeFileSync(path, applyEdits(text, edits));
console.log(`${path}: Hyperdrive ${hyperdriveId}`);
