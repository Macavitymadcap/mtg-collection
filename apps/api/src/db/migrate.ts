import { config } from "../config.js";
import { createKnex } from "./knex.js";

const db = createKnex(config);
const [command, name] = process.argv.slice(2);

try {
  if (command === "latest") {
    // Knex types these results as any
    const [batch, files] = (await db.migrate.latest()) as [number, string[]];
    console.log(files.length ? `Batch ${batch}: ${files.join(", ")}` : "Already up to date");
  } else if (command === "rollback") {
    const [batch, files] = (await db.migrate.rollback()) as [number, string[]];
    console.log(files.length ? `Rolled back batch ${batch}: ${files.join(", ")}` : "Nothing to roll back");
  } else if (command === "make" && name) {
    console.log(`Created ${await db.migrate.make(name)}`);
  } else {
    console.log("Usage: migrate.ts latest | rollback | make <name>");
    process.exitCode = 1;
  }
} finally {
  await db.destroy();
}
