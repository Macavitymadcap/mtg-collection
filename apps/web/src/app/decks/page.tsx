import type { JSX } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function DecksPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Decks" subtitle="Build decks from the cards you own" />
      <ComingSoon phase={5} />
    </>
  );
}
