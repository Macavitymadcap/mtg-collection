import type { JSX } from "react";
import { ErrorPanel } from "@/components/feedback/error-panel";

/** Shown for unknown URLs and for pages that call notFound(). */
export default function NotFound(): JSX.Element {
  return (
    <ErrorPanel
      title="Not found"
      message="There's nothing here. It may have been deleted, or the link is wrong."
      links={[
        { href: "/collection", label: "Your collection" },
        { href: "/decks", label: "Your decks" },
      ]}
    />
  );
}
