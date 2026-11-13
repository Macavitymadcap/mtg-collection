import type { JSX } from "react";
import { routeId } from "@/lib/route-id";
import { EntryView } from "@/features/collection/components/entry-view";

export default async function CollectionEntryPage({ params }: PageProps<"/collection/[id]">): Promise<JSX.Element> {
  const { id } = await params;
  return <EntryView id={routeId(id)} />;
}
