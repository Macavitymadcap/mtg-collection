import type { JSX, ReactNode } from "react";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import InboxRounded from "@mui/icons-material/InboxRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { errorMessage } from "@/lib/errors";

/** The rough shape of what's loading, so the page doesn't jump when it arrives. */
export type LoadingShape = "tiles" | "cards" | "detail" | "block";

/** Placeholder while a page's data loads. */
export function LoadingState({ shape = "block", count = 6 }: { shape?: LoadingShape; count?: number }): JSX.Element {
  if (shape === "detail") {
    return (
      <Grid container spacing={6} aria-busy="true" aria-label="Loading">
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" sx={{ aspectRatio: "5 / 7", height: "auto" }} />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton variant="rounded" height={400} />
        </Grid>
      </Grid>
    );
  }
  if (shape === "block") {
    return <Skeleton variant="rounded" height={400} aria-busy="true" aria-label="Loading" />;
  }
  // Card images are 5:7; tiles are deck or stat cards
  const size = shape === "cards" ? { xs: 4, sm: 3, md: 2 } : { xs: 12, sm: 6, lg: 4 };
  return (
    <Grid container spacing={4} aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <Grid key={i} size={size}>
          {shape === "cards" ? (
            <Skeleton variant="rounded" sx={{ aspectRatio: "5 / 7", height: "auto" }} />
          ) : (
            <Skeleton variant="rounded" height={140} />
          )}
        </Grid>
      ))}
    </Grid>
  );
}

interface EmptyStateProps {
  title: string;
  message?: ReactNode;
  /** What to do next, usually a button. */
  action?: ReactNode;
}

/** Nothing to show yet, with what to do about it. */
export function EmptyState({ title, message, action }: EmptyStateProps): JSX.Element {
  return (
    <Paper sx={{ p: 6, textAlign: "center", borderStyle: "dashed" }}>
      <Stack sx={{ gap: 2, alignItems: "center" }}>
        <InboxRounded color="disabled" sx={{ fontSize: 40 }} />
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        {message && <Typography color="text.secondary">{message}</Typography>}
        {action && (
          <Stack direction="row" sx={{ gap: 2, mt: 2, flexWrap: "wrap", justifyContent: "center" }}>
            {action}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

interface ErrorStateProps {
  error: unknown;
  /** Shown when the error doesn't carry a message from the API. */
  fallback: string;
  onRetry?: () => void;
}

/** A failed load, with the API's explanation when there is one, and a retry. */
export function ErrorState({ error, fallback, onRetry }: ErrorStateProps): JSX.Element {
  return (
    <Alert
      severity="error"
      icon={<ErrorOutlineRounded />}
      action={
        onRetry && (
          <Button color="inherit" onClick={onRetry}>
            Retry
          </Button>
        )
      }
    >
      {errorMessage(error, fallback)}
    </Alert>
  );
}
