import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Defaults: no incremental cache. Every page here is dynamic (it shows live data), so there's nothing to cache.
export default defineCloudflareConfig();
