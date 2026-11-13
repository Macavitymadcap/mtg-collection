import type {
  CollectionEntry,
  CollectionEntryDetail,
  CollectionFilter,
  CollectionSort,
  CreateCollectionEntryRequest,
  Page,
  UpdateCollectionEntryRequest,
} from "@mtg/shared";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CollectionQuery extends CollectionFilter {
  page: number;
  limit: number;
  sort: CollectionSort;
}

/** Query keys for the collection. */
export const collectionKeys = {
  all: ["collection"] as const,
  list: (query: CollectionQuery) => [...collectionKeys.all, "list", query] as const,
  detail: (id: number) => [...collectionKeys.all, "detail", id] as const,
};

/** One page of the collection. Keeps showing the previous page while the next loads. */
export function useCollection(query: CollectionQuery): UseQueryResult<Page<CollectionEntry>> {
  return useQuery({
    queryKey: collectionKeys.list(query),
    queryFn: () => api<Page<CollectionEntry>>("/collection", { params: { ...query } }),
    placeholderData: keepPreviousData,
  });
}

export function useCollectionEntry(id: number): UseQueryResult<CollectionEntryDetail> {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => api<CollectionEntryDetail>(`/collection/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export interface AddResult {
  entry: CollectionEntry;
  /** False if the copies were added to an identical existing entry. */
  created: boolean;
}

/** Adds copies. The API answers 201 for a new entry and 200 when it merged into an existing one. */
export function useAddToCollection(): UseMutationResult<AddResult, Error, CreateCollectionEntryRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api("/collection", {
        method: "POST",
        body,
        parseResponse: async (response): Promise<AddResult> => ({
          entry: (await response.json()) as CollectionEntry,
          created: response.status === 201,
        }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  });
}

/** Edits an entry. The returned entry may have a different id if it was merged into another. */
export function useUpdateEntry(id: number): UseMutationResult<CollectionEntry, Error, UpdateCollectionEntryRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api<CollectionEntry>(`/collection/${id}`, { method: "PATCH", body }),
    onSuccess: (entry) => {
      if (entry.id !== id) queryClient.removeQueries({ queryKey: collectionKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

export function useDeleteEntry(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api(`/collection/${id}`, { method: "DELETE", parseResponse: () => undefined });
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: collectionKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}
