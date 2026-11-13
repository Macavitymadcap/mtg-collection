import type { JSX } from "react";
import Link from "next/link";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/layout/page-header";

/** Shown for unknown URLs and for pages that call notFound(). */
export default function NotFound(): JSX.Element {
  return (
    <>
      <PageHeader title="Not found" />
      <Typography>
        There&apos;s nothing here. Go to <Link href="/collection">your collection</Link> or{" "}
        <Link href="/decks">your decks</Link>.
      </Typography>
    </>
  );
}
