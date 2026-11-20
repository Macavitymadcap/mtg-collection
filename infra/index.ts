import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

// The Cloudflare provider reads CLOUDFLARE_API_TOKEN from the environment.
const config = new pulumi.Config();
const accountId = config.require("accountId");

const dbPassword = process.env.MTG_DB_PASSWORD;
if (!dbPassword) throw new Error("Set MTG_DB_PASSWORD to the database user's password");

/** Aiven signs its servers' certificates with its own CA, so Hyperdrive needs it to check them. */
const databaseCa = new cloudflare.MtlsCertificate("database-ca", {
  accountId,
  name: "mtg-collection-aiven-ca",
  ca: true,
  certificates: readFileSync(join(__dirname, "aiven-ca.pem"), "utf8"),
});

/**
 * Hyperdrive in front of the hosted MySQL: pooled connections for the API
 * Worker, and verified TLS to the database. Caching is off, so pages show a
 * change straight after it's made.
 */
const hyperdrive = new cloudflare.HyperdriveConfig(
  "database",
  {
    accountId,
    name: "mtg-collection",
    origin: {
      scheme: "mysql",
      host: config.require("dbHost"),
      port: config.requireNumber("dbPort"),
      database: config.require("dbName"),
      user: config.require("dbUser"),
      password: pulumi.secret(dbPassword),
    },
    mtls: { caCertificateId: databaseCa.id, sslmode: "VERIFY_IDENTITY" },
    caching: { disabled: true },
    // Well inside what the 1 GB database server allows
    originConnectionLimit: 20,
  },
  { protect: true },
);

/** Written into apps/api/wrangler.jsonc by scripts/sync-wrangler.ts before deploying. */
export const hyperdriveId = hyperdrive.id;
