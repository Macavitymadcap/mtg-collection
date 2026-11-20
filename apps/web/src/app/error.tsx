"use client"; // Error boundaries must be client components

import { useEffect, type JSX } from "react";
import Button from "@mui/material/Button";
import { ErrorPanel } from "@/components/feedback/error-panel";

/** Shown in place of a page that threw while rendering. */
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }): JSX.Element {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorPanel
      title="Something went wrong"
      message="This page hit an unexpected error. Try again, or go back to the previous page."
      actions={
        <Button variant="contained" onClick={() => retry()}>
          Try again
        </Button>
      }
      links={[{ href: "/", label: "Home" }]}
    />
  );
}
