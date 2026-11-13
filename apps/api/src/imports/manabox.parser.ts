import type { Condition, Finish, ImportRowError } from "@mtg/shared";
import { parse } from "csv-parse/sync";
import { BadRequest } from "../core/errors.js";

/** One usable row of a ManaBox export. */
export interface ManaboxRow {
  /** Line in the file, counting the header as line 1. */
  line: number;
  name: string;
  scryfallId: string;
  quantity: number;
  finish: Finish;
  condition: Condition;
  language: string;
  signed: boolean;
  altered: boolean;
  misprint: boolean;
  proxy: boolean;
  purchasePrice: number | null;
  currency: string | null;
  addedAt: Date | null;
}

export interface ManaboxParseResult {
  rows: ManaboxRow[];
  errors: ImportRowError[];
  /** Data rows in the file, valid or not. */
  rowCount: number;
}

const finishMap: Record<string, Finish> = { normal: "nonfoil", foil: "foil", etched: "etched" };

/**
 * ManaBox uses Cardmarket's grades. Mapped to the nearest TCGplayer-style grade the app uses.
 * Only near_mint has been seen in a real export; the rest follow Cardmarket's names.
 */
const conditionMap: Record<string, Condition> = {
  mint: "NM",
  near_mint: "NM",
  excellent: "LP",
  good: "MP",
  light_played: "MP",
  played: "HP",
  poor: "DMG",
};

const REQUIRED = ["scryfall id", "quantity"] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses a ManaBox collection CSV. Header names are matched case-insensitively,
 * because they have varied between ManaBox versions. Throws BadRequest if the
 * file isn't usable at all; bad rows are returned as errors.
 */
export function parseManaboxCsv(csv: string): ManaboxParseResult {
  let records: Record<string, string>[];
  try {
    records = parse(csv, {
      bom: true,
      columns: (header: string[]) => header.map((name) => name.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    throw new BadRequest(`Couldn't read the CSV: ${error instanceof Error ? error.message : String(error)}`);
  }

  const first = records[0];
  if (!first) throw new BadRequest("The CSV has no rows");
  const missing = REQUIRED.filter((column) => !(column in first));
  if (missing.length) {
    throw new BadRequest(
      `This doesn't look like a ManaBox export: missing ${missing.map((m) => `"${m}"`).join(", ")} column(s)`,
    );
  }

  const rows: ManaboxRow[] = [];
  const errors: ImportRowError[] = [];

  records.forEach((record, index) => {
    const line = index + 2;
    const name = record["name"] || null;
    const problems: string[] = [];
    const flag = (column: string) => (record[column] ?? "").toLowerCase() === "true";

    const scryfallId = (record["scryfall id"] ?? "").toLowerCase();
    if (!UUID.test(scryfallId)) problems.push("missing or invalid Scryfall ID");

    const quantity = Number(record["quantity"]);
    if (!Number.isInteger(quantity) || quantity < 1) problems.push(`invalid quantity "${record["quantity"]}"`);

    const finishValue = (record["foil"] || "normal").toLowerCase();
    const finish = finishMap[finishValue];
    if (!finish) problems.push(`unknown foil value "${finishValue}"`);

    const conditionValue = (record["condition"] || "near_mint").toLowerCase();
    const condition = conditionMap[conditionValue];
    if (!condition) problems.push(`unknown condition "${conditionValue}"`);

    const language = (record["language"] || "en").toLowerCase();
    if (language.length < 2 || language.length > 5) problems.push(`invalid language "${language}"`);

    const priceValue = record["purchase price"] ?? "";
    const purchasePrice = priceValue === "" ? null : Number(priceValue);
    if (purchasePrice !== null && (!Number.isFinite(purchasePrice) || purchasePrice < 0)) {
      problems.push(`invalid purchase price "${priceValue}"`);
    }
    const currencyValue = (record["purchase price currency"] ?? "").toUpperCase();
    const currency = /^[A-Z]{3}$/.test(currencyValue) ? currencyValue : null;

    const added = record["added"] ? new Date(record["added"]) : null;
    const addedAt = added && !Number.isNaN(added.getTime()) ? added : null;

    if (problems.length || !finish || !condition) {
      errors.push({ line, name, message: problems.join("; ") });
      return;
    }

    rows.push({
      line,
      name: name ?? scryfallId,
      scryfallId,
      quantity,
      finish,
      condition,
      language,
      signed: flag("signed"),
      altered: flag("altered"),
      misprint: flag("misprint"),
      proxy: flag("proxy"),
      purchasePrice: purchasePrice === null ? null : Math.round(purchasePrice * 100) / 100,
      currency: purchasePrice === null ? null : currency,
      addedAt,
    });
  });

  return { rows, errors, rowCount: records.length };
}
