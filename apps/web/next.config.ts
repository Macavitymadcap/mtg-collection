import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
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
