import type { ImportSummary, PreconImportRequest, PreconSummary } from "@mtg/shared";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { collectionKeys } from "@/features/collection/queries";
import { deckKeys } from "@/features/decks/queries";

interface ImportInput {
  csv: string;
  dryRun: boolean;
}

/**
 * Previews or imports a ManaBox CSV. A 422 (some rows are bad) still
 * resolves, because its body is the summary listing the bad rows.
 */
export function useManaboxImport(): UseMutationResult<ImportSummary, Error, ImportInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ csv, dryRun }) =>
      api<ImportSummary>("/import/manabox", {
        method: "POST",
        params: dryRun ? { dryRun: true } : {},
        body: { csv },
        reject: (response) => !response.ok && response.status !== 422,
      }),
    onSuccess: (summary) => {
      if (!summary.dryRun) return queryClient.invalidateQueries({ queryKey: collectionKeys.all });
    },
  });
}

/** Preconstructed products matching a search, newest first. */
export function usePrecons(search: string): UseQueryResult<PreconSummary[]> {
  return useQuery({
    queryKey: ["precons", search],
    queryFn: () => api<PreconSummary[]>("/catalog/precons", { params: { search, limit: 50 } }),
    staleTime: 60 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

/**
 * What importing a product would do. A dry run changes nothing, so it's a
 * query: it re-runs whenever the product, the deck option or the name changes.
 */
export function usePreconPreview(request: PreconImportRequest | null): UseQueryResult<ImportSummary> {
  return useQuery({
    queryKey: ["precon-preview", request],
    queryFn: () =>
      api<ImportSummary>("/import/precon", {
        method: "POST",
        params: { dryRun: true },
        body: request ?? undefined,
        reject: (response) => !response.ok && response.status !== 422,
      }),
    enabled: request !== null,
    staleTime: 0,
  });
}

/** Imports a product; a 422 resolves with the problems listed. */
export function usePreconImport(): UseMutationResult<ImportSummary, Error, PreconImportRequest> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) =>
      api<ImportSummary>("/import/precon", {
        method: "POST",
        body,
        reject: (response) => !response.ok && response.status !== 422,
      }),
    onSuccess: (summary) => {
      if (summary.dryRun) return;
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: collectionKeys.all }),
        queryClient.invalidateQueries({ queryKey: deckKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["precon-preview"] }),
      ]).then(() => undefined);
    },
  });
}
