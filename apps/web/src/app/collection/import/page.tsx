import { Suspense, type JSX } from "react";
import { ImportView } from "@/features/imports/import-view";

export default function ImportPage(): JSX.Element {
  // The tab is read from the query string, which needs a Suspense boundary
  return (
    <Suspense>
      <ImportView />
    </Suspense>
  );
}
