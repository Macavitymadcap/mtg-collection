"use client";

import type { JSX } from "react";
import Link from "next/link";
import { labels } from "@mtg/shared";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { IdentityStripe } from "@/components/cards/color-bar";
import { ColorPips } from "@/components/cards/color-pips";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/page-states";
import { PageHeader } from "@/components/layout/page-header";
import { useDecks } from "../queries";
import { useCanEdit } from "@/features/auth/queries";
import { NewDeckButton } from "./new-deck-button";

/** Every deck as a card, with format, colours, size and warnings. */
export function DecksView(): JSX.Element {
  const { data: decks, isPending, isError, error, refetch } = useDecks();
  const canEdit = useCanEdit();

  return (
    <>
      <PageHeader title="Decks" subtitle="Built from the cards you own" actions={canEdit && <NewDeckButton />} />

      {isPending ? (
        <LoadingState shape="tiles" count={3} />
      ) : isError ? (
        <ErrorState error={error} fallback="Could not load decks." onRetry={() => void refetch()} />
      ) : decks.length === 0 ? (
        <EmptyState
          title="No decks yet"
          message={canEdit ? "Use New deck to start building from your collection." : undefined}
        />
      ) : (
        <Grid container spacing={4}>
          {decks.map((deck) => (
            <Grid key={deck.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card sx={{ height: "100%" }}>
                <CardActionArea component={Link} href={`/decks/${deck.id}`} sx={{ height: "100%" }}>
                  {deck.coverArt && (
                    <CardMedia
                      component="img"
                      image={deck.coverArt}
                      alt=""
                      loading="lazy"
                      sx={{ height: 120, objectFit: "cover", objectPosition: "center 30%" }}
                    />
                  )}
                  <IdentityStripe colors={deck.colorIdentity} />
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
