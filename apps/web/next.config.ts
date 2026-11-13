import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // With Turbopack's on-disk dev cache, starting `next dev` with a warm cache
    // (from a previous run) left open pages reloading themselves several times a
    // second, in every one of five tries; cold starts never did. Off, at the cost
    // of slower dev restarts. Re-test when upgrading Next.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    // Card images and mana symbols are served by Scryfall's CDN. They're
    // already sized, so they're shown as they are rather than re-encoded.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cards.scryfall.io" },
      { protocol: "https", hostname: "svgs.scryfall.io" },
    ],
  },
};

export default nextConfig;
