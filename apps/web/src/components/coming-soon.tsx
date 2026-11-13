import type { JSX } from "react";
import Alert from "@mui/material/Alert";

/** Placeholder for pages built in a later phase. */
export function ComingSoon({ phase }: { phase: number }): JSX.Element {
  return <Alert severity="info">This page is built in phase {phase}.</Alert>;
}
