"use client";

import type { JSX } from "react";
import Link from "next/link";
import { labels } from "@mtg/shared";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ColorPips } from "@/components/cards/color-pips";
import { PageHeader } from "@/components/layout/page-header";
import { errorMessage } from "@/lib/errors";
import { useDecks } from "../queries";
import { NewDeckButton } from "./new-deck-button";

/** Every deck as a card, with format, colours, size and warnings. */
export function DecksView(): JSX.Element {
  const { data: decks, isPending, isError, error, refetch } = useDecks();

  return (
    <>
      <PageHeader title="Decks" subtitle="Built from the cards you own" actions={<NewDeckButton />} />

      {isPending ? (
        <Grid container spacing={4}>
          {Array.from({ length: 3 }, (_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      ) : isError ? (
        <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
          {errorMessage(error, "Could not load decks.")}
        </Alert>
      ) : decks.length === 0 ? (
        <Typography color="text.secondary">No decks yet. Create one to start building from your collection.</Typography>
      ) : (
        <Grid container spacing={4}>
          {decks.map((deck) => (
            <Grid key={deck.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardActionArea component={Link} href={`/decks/${deck.id}`} sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack sx={{ gap: 2 }}>
                      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, alignItems: "flex-start" }}>
                        <Typography variant="h6" component="h2">
                          {deck.name}
                        </Typography>
                        <ColorPips colors={deck.colorIdentity} />
                      </Stack>
                      {deck.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {deck.description}
                        </Typography>
                      )}
                      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                        <Chip size="small" label={labels.format[deck.format]} />
                        <Chip size="small" variant="outlined" label={`${deck.cardCount} cards`} />
                        {deck.warningCount > 0 && (
                          <Chip
                            size="small"
                            color="warning"
                            icon={<WarningAmberRounded />}
                            label={`${deck.warningCount} ${deck.warningCount === 1 ? "warning" : "warnings"}`}
                          />
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
