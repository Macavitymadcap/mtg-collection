import { Suspense, type JSX } from "react";
import { CollectionView } from "@/features/collection/components/collection-view";

export default function CollectionPage(): JSX.Element {
  // The view reads the URL's query string, which needs a Suspense boundary
  return (
    <Suspense>
      <CollectionView />
    </Suspense>
  );
}
