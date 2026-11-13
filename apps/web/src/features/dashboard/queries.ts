import type { CollectionStats } from "@mtg/shared";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { collectionKeys } from "@/features/collection/queries";

/**
 * Dashboard totals. Keyed under the collection so anything that changes the
 * collection (or decks, which invalidate it) refreshes them too.
 */
export function useStats(): UseQueryResult<CollectionStats> {
  return useQuery({
    queryKey: [...collectionKeys.all, "stats"],
    queryFn: () => api<CollectionStats>("/stats"),
  });
}
