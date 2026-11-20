import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { z } from "zod";
import { api } from "@/lib/api";

const sessionSchema = z
  .object({
    user: z.object({
      name: z.string(),
      image: z.string().nullish(),
      githubLogin: z.string().nullish(),
    }),
  })
  .nullable();

/** The signed-in person, or null for visitors. */
export type Session = z.infer<typeof sessionSchema>;

export const sessionKey = ["session"] as const;

/** Who is signed in, from the session cookie (Better Auth's get-session route, through the BFF). */
export function useSession(): UseQueryResult<Session> {
  return useQuery({
    queryKey: sessionKey,
    queryFn: () => api("/auth/get-session", { schema: sessionSchema }),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

/**
 * True once it's known that someone is signed in. While the session is
 * loading (or can't be loaded) the site stays read-only, so edit controls
 * never flash up for visitors.
 */
export function useCanEdit(): boolean {
  const { data } = useSession();
  return Boolean(data);
}

/** Starts signing in with GitHub, then comes back to the current page. */
export function useSignIn(): UseMutationResult<void, Error, void> {
  return useMutation({
    mutationFn: async () => {
      const here = window.location.pathname + window.location.search;
      const { url } = await api("/auth/sign-in/social", {
        method: "POST",
        // Back to this page either way; a refusal adds ?error=<code> (see SignInError)
        body: { provider: "github", callbackURL: here, errorCallbackURL: here },
        schema: z.object({ url: z.url() }),
      });
      window.location.assign(url);
    },
  });
}

export function useSignOut(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api("/auth/sign-out", { method: "POST", body: {} });
    },
    onSuccess: async () => {
      queryClient.setQueryData(sessionKey, null);
      // Everything else was fetched signed in (prices, notes), so fetch it again without them
      await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
    },
  });
}
