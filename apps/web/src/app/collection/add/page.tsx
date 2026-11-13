import type { JSX } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function AddCardPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Add cards" subtitle="Search Scryfall and add printings to your collection" />
      <ComingSoon phase={3} />
    </>
  );
}
