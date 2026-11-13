import type { JSX } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";

export default function DataPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Data" subtitle="Export or import the whole database as JSON" />
      <Alert severity="info" sx={{ mb: 4 }}>
        To add cards from a ManaBox export, use <Link href="/collection/import">Collection → Import</Link>.
      </Alert>
      <ComingSoon phase={6} />
    </>
  );
}
