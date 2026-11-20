import type { Card } from "@mtg/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Query keys for Scryfall lookups. Card data rarely changes, so these stay fresh for an hour. */
export const catalogueKeys = {
  all: ["catalogue"] as const,
  names: (query: string) => [...catalogueKeys.all, "names", query] as const,
  printings: (name: string) => [...catalogueKeys.all, "printings", name] as const,
};

const HOUR = 60 * 60 * 1000;

/** Card names matching a partial name. Needs at least 2 characters. */
export function useCardNames(query: string): UseQueryResult<string[]> {
  const q = query.trim();
  return useQuery({
    queryKey: catalogueKeys.names(q.toLowerCase()),
    queryFn: () => api<string[]>("/catalogue/autocomplete", { params: { q } }),
    enabled: q.length >= 2,
    staleTime: HOUR,
  });
}

/** Every printing of an exact card name, oldest first. */
export function usePrintings(name: string | null): UseQueryResult<Card[]> {
  return useQuery({
    queryKey: catalogueKeys.printings(name ?? ""),
    queryFn: () => api<Card[]>("/catalogue/printings", { params: { name: name ?? "" } }),
    enabled: Boolean(name),
    staleTime: HOUR,
  });
}
