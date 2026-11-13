import type { CreateDeckRequest, DeckDetail, DeckSummary, SetDeckCardRequest, UpdateDeckRequest } from "@mtg/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { collectionKeys } from "@/features/collection/queries";

/** Query keys for decks. */
export const deckKeys = {
  all: ["decks"] as const,
  list: () => [...deckKeys.all, "list"] as const,
  detail: (id: number) => [...deckKeys.all, "detail", id] as const,
};

export function useDecks(): UseQueryResult<DeckSummary[]> {
  return useQuery({ queryKey: deckKeys.list(), queryFn: () => api<DeckSummary[]>("/decks") });
}

export function useDeck(id: number): UseQueryResult<DeckDetail> {
  return useQuery({
    queryKey: deckKeys.detail(id),
    queryFn: () => api<DeckDetail>(`/decks/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/**
 * After a deck changes: store the deck the API returned, and refresh deck
 * lists and the collection, whose allocation counts may have changed.
 */
function deckChanged(queryClient: QueryClient, deck: DeckDetail): Promise<void> {
  queryClient.setQueryData(deckKeys.detail(deck.id), deck);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: deckKeys.list() }),
    queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
  ]).then(() => undefined);
}

export function useCreateDeck(): UseMutationResult<DeckDetail, Error, CreateDeckRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api<DeckDetail>("/decks", { method: "POST", body }),
    onSuccess: (deck) => deckChanged(queryClient, deck),
  });
}

export function useUpdateDeck(id: number): UseMutationResult<DeckDetail, Error, UpdateDeckRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api<DeckDetail>(`/decks/${id}`, { method: "PATCH", body }),
    onSuccess: (deck) => deckChanged(queryClient, deck),
  });
}

export function useSetDeckCard(id: number): UseMutationResult<DeckDetail, Error, SetDeckCardRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => api<DeckDetail>(`/decks/${id}/cards`, { method: "PUT", body }),
    onSuccess: (deck) => deckChanged(queryClient, deck),
  });
}

export function useDeleteDeck(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api(`/decks/${id}`, { method: "DELETE", parseResponse: () => undefined });
    },
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: deckKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: deckKeys.list() }),
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
      ]).then(() => undefined);
    },
  });
}
