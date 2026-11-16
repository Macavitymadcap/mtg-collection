import type { JSX } from "react";
import { RequireSignIn } from "@/features/auth/require-sign-in";
import { AddCardView } from "@/features/collection/components/add-card-view";

export default function AddCardsPage(): JSX.Element {
  return (
    <RequireSignIn title="Add cards" purpose="add cards">
      <AddCardView />
    </RequireSignIn>
  );
}
