import type { Card } from "@mtg/shared";

/** "MRD #282" */
export function printingLabel(card: Pick<Card, "setCode" | "collectorNumber">): string {
  return `${card.setCode.toUpperCase()} #${card.collectorNumber}`;
}

/** "£2.57", or the bare number if the currency code isn't recognised. */
export function formatPrice(price: number | null, currency: string | null): string {
  if (price === null) return "";
  if (!currency) return price.toFixed(2);
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price);
  } catch {
    return `${price.toFixed(2)} ${currency}`;
  }
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
}
