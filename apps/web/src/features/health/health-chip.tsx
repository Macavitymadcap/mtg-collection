"use client";

import type { JSX } from "react";
import Chip from "@mui/material/Chip";
import { useHealth } from "./queries";

/** Shows whether the BFF can reach the API and the API can reach MySQL. */
export function HealthChip(): JSX.Element {
  const { data, isPending, isError } = useHealth();

  if (isPending) return <Chip label="Checking API…" size="small" />;
  if (isError) return <Chip label="API unreachable" color="error" size="small" />;
  if (data.database !== "ok") return <Chip label="Database unreachable" color="warning" size="small" />;
  return <Chip label="API and database OK" color="success" size="small" />;
}
