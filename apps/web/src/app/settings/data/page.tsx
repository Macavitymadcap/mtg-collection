import type { JSX } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function DataPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Data" subtitle="Export or import the whole database as JSON" />
      <ComingSoon phase={6} />
    </>
  );
}
