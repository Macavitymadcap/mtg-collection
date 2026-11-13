import type { JSX } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/coming-soon";
import { HealthChip } from "@/features/health/health-chip";

export default function DashboardPage(): JSX.Element {
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your collection at a glance" actions={<HealthChip />} />
      <ComingSoon phase={3} />
    </>
  );
}
