import { notFound } from "next/navigation";

/** A route's numeric id, or the not-found page if it isn't one (e.g. /decks/abc). */
export function routeId(value: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return id;
}
