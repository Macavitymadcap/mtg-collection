import { Suspense, type JSX } from "react";
import { RequireSignIn } from "@/features/auth/require-sign-in";
import { ImportView } from "@/features/imports/import-view";

export default function ImportPage(): JSX.Element {
  // The tab is read from the query string, which needs a Suspense boundary
  return (
    <RequireSignIn title="Import cards" purpose="import cards">
      <Suspense>
        <ImportView />
      </Suspense>
    </RequireSignIn>
  );
}
