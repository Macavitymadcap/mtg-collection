"use client";

import type { JSX } from "react";
import Link from "next/link";
import { labels } from "@mtg/shared";
import AddRounded from "@mui/icons-material/AddRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CardImage } from "@/components/cards/card-image";
import { ColorPips } from "@/components/cards/color-pips";
import { PageHeader } from "@/components/layout/page-header";
import { useDecks } from "@/features/decks/queries";
import { HealthChip } from "@/features/health/health-chip";
import { errorMessage } from "@/lib/errors";
import { formatPrice, printingLabel } from "@/lib/format";
import { useStats } from "./queries";

function Stat({ label, value }: { label: string; value: string | number }): JSX.Element {
  return (
    <Paper sx={{ p: 4, height: "100%" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" component="p">
        {value}
      </Typography>
    </Paper>
  );
}

/** Totals, recently added cards and deck shortcuts. */
export function DashboardView(): JSX.Element {
  const stats = useStats();
  const decks = useDecks();

  const header = <PageHeader title="Dashboard" subtitle="Your collection at a glance" actions={<HealthChip />} />;

  if (stats.isPending) {
    return (
      <>
        {header}
        <Grid container spacing={4}>
          {Array.from({ length: 4 }, (_, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Skeleton variant="rounded" height={96} />
            </Grid>
          ))}
        </Grid>
      </>
    );
  }

  if (stats.isError) {
    return (
      <>
        {header}
        <Alert severity="error">{errorMessage(stats.error, "Could not load your collection's totals.")}</Alert>
      </>
    );
  }

  const { data } = stats;
  const number = (value: number): string => value.toLocaleString("en-GB");

  if (data.entries === 0) {
    return (
      <>
        {header}
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Your collection is empty
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            Add cards one at a time, or import a ManaBox export or a preconstructed deck.
          </Typography>
          <Stack direction="row" sx={{ gap: 2, justifyContent: "center" }}>
            <Button component={Link} href="/collection/add" variant="contained" startIcon={<AddRounded />}>
              Add cards
            </Button>
            <Button component={Link} href="/collection/import" startIcon={<UploadFileRounded />}>
              Import
            </Button>
          </Stack>
        </Paper>
      </>
    );
  }

  return (
    <>
      {header}

      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Cards owned" value={number(data.copies)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat label="Different cards" value={number(data.uniqueCards)} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat
            label="In decks"
            value={`${number(data.allocated)} in ${number(data.decks)} ${data.decks === 1 ? "deck" : "decks"}`}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Stat
            label="Spent (where recorded)"
            value={data.spent.length ? data.spent.map((s) => formatPrice(s.total, s.currency)).join(" + ") : "—"}
          />
        </Grid>
      </Grid>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" component="h2">
              Recently added
            </Typography>
            <Button component={Link} href="/collection?sort=-createdAt">
              See all
            </Button>
          </Stack>
          <Grid container spacing={3}>
            {data.recent.map((entry) => (
              <Grid key={entry.id} size={{ xs: 4, sm: 3, md: 2 }}>
                <Box
                  component={Link}
                  href={`/collection/${entry.id}`}
                  sx={{ display: "block", color: "inherit", textDecoration: "none" }}
                >
                  <CardImage card={entry.card} />
                  <Typography variant="caption" color="text.secondary" component="p" noWrap sx={{ mt: 1 }}>
                    {entry.quantity} × {printingLabel(entry.card)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" component="h2">
              Decks
            </Typography>
            <Button component={Link} href="/decks">
              All decks
            </Button>
          </Stack>
          <Paper>
            {decks.isPending ? (
              <Skeleton variant="rounded" height={120} />
            ) : decks.isError || decks.data.length === 0 ? (
              <Typography color="text.secondary" sx={{ p: 4 }}>
                {decks.isError ? "Could not load decks." : "No decks yet."}
              </Typography>
            ) : (
              <List>
                {decks.data.slice(0, 8).map((deck) => (
                  <ListItemButton key={deck.id} component={Link} href={`/decks/${deck.id}`}>
                    <ListItemText
                      primary={deck.name}
                      secondary={`${labels.format[deck.format]} · ${deck.cardCount} cards${deck.warningCount ? ` · ${deck.warningCount} to check` : ""}`}
                    />
                    <ColorPips colors={deck.colorIdentity} size={16} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </>
  );
}
