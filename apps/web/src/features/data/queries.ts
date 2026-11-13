import type { BackupImportSummary, DataCounts, ExportFile } from "@mtg/shared";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { api } from "@/lib/api";

export const dataKeys = { counts: ["data", "counts"] as const };

/** What's in the database now. */
export function useDataCounts(): UseQueryResult<DataCounts> {
  return useQuery({ queryKey: dataKeys.counts, queryFn: () => api<DataCounts>("/data/counts") });
}

/** Fetches an export and has the browser save it as a dated JSON file. */
export function useDownloadExport(): UseMutationResult<ExportFile, Error, void> {
  return useMutation({
    mutationFn: () => api<ExportFile>("/data/export"),
    onSuccess: (file) => {
      const blob = new Blob([`${JSON.stringify(file, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mtg-collection-${file.exportedAt.slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
}

interface ImportInput {
  file: unknown;
  dryRun: boolean;
}

/** Checks (dryRun) or loads an export file, replacing everything. */
export function useBackupImport(): UseMutationResult<BackupImportSummary, Error, ImportInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, dryRun }) =>
      api<BackupImportSummary>("/data/import", {
        method: "POST",
        params: dryRun ? { dryRun: true } : {},
        body: file as Record<string, unknown>,
      }),
    onSuccess: (summary) => {
      // Everything has changed: refetch every query
      if (!summary.dryRun) return queryClient.invalidateQueries();
    },
  });
}
