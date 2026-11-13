import type { JSX } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function CollectionPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Collection" subtitle="Every card you own" />
      <ComingSoon phase={3} />
    </>
  );
}
