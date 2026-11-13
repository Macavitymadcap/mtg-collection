import type { ImportSummary } from "@mtg/shared";
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { collectionKeys } from "@/features/collection/queries";

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
