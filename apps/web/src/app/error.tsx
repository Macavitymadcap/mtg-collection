"use client"; // Error boundaries must be client components

import { useEffect, type JSX } from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";

/** Shown in place of a page that threw while rendering. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }): JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Alert severity="error" action={<Button onClick={() => retry()}>Try again</Button>}>
      <AlertTitle>Something went wrong</AlertTitle>
      This page hit an unexpected error. Try again, or go back to the previous page.
    </Alert>
  );
}
