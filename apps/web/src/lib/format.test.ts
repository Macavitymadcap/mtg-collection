import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, printingLabel } from "./format";

describe("format", () => {
  it("labels a printing by set and number", () => {
    expect(printingLabel({ setCode: "mrd", collectorNumber: "282" })).toBe("MRD #282");
  });

  it.each([
    [2.5, "GBP", "£2.50"],
    [2.5, "USD", "US$2.50"],
    [2.5, null, "2.50"],
    [2.5, "XYZ", "XYZ 2.50"],
    [null, "GBP", ""],
  ])("formats %s %s as %s", (price, currency, expected) => {
    expect(formatPrice(price, currency).replace(/ /g, " ")).toBe(expected);
  });

  it("formats dates the British way", () => {
    expect(formatDate("2026-11-13T12:00:00Z")).toBe("13 Nov 2026");
  });
});
