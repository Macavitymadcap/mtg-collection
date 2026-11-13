import { QueryClient } from "@tanstack/react-query";
import { isResponseError } from "up-fetch";

/** Creates the app's QueryClient with shared defaults. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Retrying a 4xx won't change the answer
          if (isResponseError(error) && error.status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });
}
