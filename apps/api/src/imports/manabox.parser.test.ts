import { describe, expect, it } from "vitest";
import { ApiError } from "../core/errors.js";
import { parseManaboxCsv } from "./manabox.parser.js";

// Header from a real ManaBox export (November 2026)
const HEADER =
  "Binder Name,Binder Type,Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Signed,Condition,Language,Proxy,Purchase price currency,Added";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\n");
}

const furnace =
  "old cards,binder,Great Furnace,EOC,Edge of Eternities Commander,161,normal,common,3,107282,74c5bb44-d72c-4c1a-a38f-86b4a8f49ae1,2.57,false,false,false,near_mint,en,false,GBP,2026-11-13T12:32:51.366Z";

describe("parseManaboxCsv", () => {
  it("maps a ManaBox row to the app's values", () => {
    const result = parseManaboxCsv(csv(furnace));

    expect(result.errors).toEqual([]);
    expect(result.rowCount).toBe(1);
    expect(result.rows).toEqual([
      {
        line: 2,
        name: "Great Furnace",
        scryfallId: "74c5bb44-d72c-4c1a-a38f-86b4a8f49ae1",
        quantity: 3,
        finish: "nonfoil",
        condition: "NM",
        language: "en",
        signed: false,
        altered: false,
        misprint: false,
        proxy: false,
        purchasePrice: 2.57,
        currency: "GBP",
        addedAt: new Date("2026-11-13T12:32:51.366Z"),
      },
    ]);
  });

  it("reads flags, foils, other conditions and quoted names", () => {
    const row =
      'b,binder,"Borrowing 100,000 Arrows",PTK,Portal Three Kingdoms,1,foil,uncommon,1,1,11111111-2222-4333-8444-555555555555,,false,true,true,played,ja,false,,';
    const [parsed] = parseManaboxCsv(csv(row)).rows;

    expect(parsed).toMatchObject({
      name: "Borrowing 100,000 Arrows",
      finish: "foil",
      condition: "HP",
      language: "ja",
      altered: true,
      signed: true,
      purchasePrice: null,
      currency: null,
      addedAt: null,
    });
  });

  it("matches headers regardless of case and a byte order mark", () => {
    const text = "﻿" + csv(furnace).replace("Scryfall ID", "SCRYFALL ID").replace("Quantity", "quantity");
    expect(parseManaboxCsv(text).rows).toHaveLength(1);
  });

  it("reports bad rows with their line numbers and keeps the good ones", () => {
    const bad = furnace.replace(",3,", ",0,").replace("near_mint", "pristine");
    const result = parseManaboxCsv(csv(furnace, bad));

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([
      { line: 3, name: "Great Furnace", message: 'invalid quantity "0"; unknown condition "pristine"' },
    ]);
  });

  it("rejects files without the required columns", () => {
    expect(() => parseManaboxCsv("Name,Count\nShock,1")).toThrow(ApiError);
    expect(() => parseManaboxCsv("Name,Count\nShock,1")).toThrow(/scryfall id/);
  });

  it("rejects an empty file", () => {
    expect(() => parseManaboxCsv(HEADER)).toThrow(/no rows/);
  });
});

describe("parseManaboxCsv edge cases", () => {
  it("rejects files that aren't CSV", () => {
    expect(() => parseManaboxCsv('"unterminated,quote\nmore')).toThrow(/Couldn't read the CSV/);
  });

  it("reports bad prices, ids and languages", () => {
    const row = furnace
      .replace("74c5bb44-d72c-4c1a-a38f-86b4a8f49ae1", "not-an-id")
      .replace(",2.57,", ",free,")
      .replace(",en,", ",x,");
    const [error] = parseManaboxCsv(csv(row)).errors;
    expect(error?.message).toBe('missing or invalid Scryfall ID; invalid language "x"; invalid purchase price "free"');
  });

  it("ignores an unknown currency and an unreadable date", () => {
    const row = furnace.replace(",GBP,", ",pounds,").replace("2026-11-13T12:32:51.366Z", "yesterday");
    const [parsed] = parseManaboxCsv(csv(row)).rows;
    expect(parsed).toMatchObject({ purchasePrice: 2.57, currency: null, addedAt: null });
  });

  it("reports unknown foil values", () => {
    expect(parseManaboxCsv(csv(furnace.replace(",normal,", ",shiny,"))).errors[0]?.message).toBe(
      'unknown foil value "shiny"',
    );
  });
});
