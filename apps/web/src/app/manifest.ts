import type { MetadataRoute } from "next";

/** Makes the app installable to a phone's home screen. No offline support. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MTG Collection",
    short_name: "MTG",
    description: "Your Magic: The Gathering collection and decks",
    start_url: "/",
    display: "standalone",
    background_color: "#121019",
    theme_color: "#4A3B8F",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
