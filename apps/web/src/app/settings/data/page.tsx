import type { JSX } from "react";
import { RequireSignIn } from "@/features/auth/require-sign-in";
import { DataView } from "@/features/data/data-view";

export default function DataPage(): JSX.Element {
  return (
    <RequireSignIn title="Data" purpose="back up or replace the data">
      <DataView />
    </RequireSignIn>
  );
}
