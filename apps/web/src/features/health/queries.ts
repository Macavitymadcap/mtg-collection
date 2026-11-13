import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

const healthSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  database: z.enum(["ok", "unreachable"]),
});

export type Health = z.infer<typeof healthSchema>;

/** API and database status, refreshed every 30 seconds. */
export function useHealth(): UseQueryResult<Health> {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api("/health", { schema: healthSchema }),
    refetchInterval: 30_000,
    retry: false,
  });
}
