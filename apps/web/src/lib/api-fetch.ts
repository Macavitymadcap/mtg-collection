import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** The service binding to the API Worker (wrangler.jsonc "services"). */
interface ApiBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/**
 * fetch() for calling the API. On Cloudflare it goes through the API
 * Worker's service binding: Worker to Worker, never over the internet, so the
 * API needn't be public. Elsewhere (next dev, tests, e2e) it's plain fetch to
 * API_BASE_URL.
 */
export function apiFetch(input: URL, init: RequestInit): Promise<Response> {
  const binding = apiBinding();
  return binding ? binding.fetch(input, init) : fetch(input, init);
}

function apiBinding(): ApiBinding | undefined {
  try {
    return (getCloudflareContext().env as { API?: ApiBinding }).API;
  } catch {
    // Not running on Cloudflare
    return undefined;
  }
}
