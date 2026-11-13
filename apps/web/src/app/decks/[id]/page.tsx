import type { JSX } from "react";
import { routeId } from "@/lib/route-id";
import { DeckBuilder } from "@/features/decks/components/deck-builder";

export default async function DeckPage({ params }: PageProps<"/decks/[id]">): Promise<JSX.Element> {
  const { id } = await params;
  return <DeckBuilder id={routeId(id)} />;
}
