"use client";

import type { JSX } from "react";
import NextLink from "next/link";
import { labels, primaryType, type Board, type DeckCard } from "@mtg/shared";
import AddRounded from "@mui/icons-material/AddRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { ManaSymbols } from "@/components/cards/mana-symbols";
import { printingLabel } from "@/lib/format";

interface DeckBoardProps {
  board: Board;
  cards: DeckCard[];
  disabled: boolean;
  onQuantity: (card: DeckCard, quantity: number) => void;
}

const sum = (cards: DeckCard[]): number => cards.reduce((total, card) => total + card.quantity, 0);

/** One board of a deck, grouped by card type, with buttons to change quantities. */
export function DeckBoard({ board, cards, disabled, onQuantity }: DeckBoardProps): JSX.Element {
  // The main deck is long, so group it by type; other boards are short lists
  const groups = new Map<string, DeckCard[]>();
  for (const card of cards) {
    const group = board === "main" ? primaryType(card.entry.card.typeLine) : labels.board[board];
    groups.set(group, [...(groups.get(group) ?? []), card]);
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {labels.board[board]}{" "}
        <Typography component="span" color="text.secondary">
          ({sum(cards)})
        </Typography>
      </Typography>

      <Stack sx={{ gap: 3 }}>
        {[...groups].map(([group, groupCards]) => (
          <Box key={group}>
            {board === "main" && (
              <Typography variant="overline" color="text.secondary">
                {group} ({sum(groupCards)})
              </Typography>
            )}
            {groupCards.map((card) => {
              const { entry } = card;
              const short = entry.available < 0;
              return (
                <Stack
                  key={entry.id}
                  direction="row"
                  sx={{ alignItems: "center", gap: 2, py: 0.5, borderBottom: 1, borderColor: "divider" }}
                >
                  <Stack direction="row" sx={{ alignItems: "center" }}>
                    <IconButton
                      size="small"
                      aria-label={`One fewer ${entry.card.name}`}
                      disabled={disabled}
                      onClick={() => onQuantity(card, card.quantity - 1)}
                    >
                      <RemoveRounded fontSize="small" />
                    </IconButton>
                    <Typography sx={{ minWidth: 24, textAlign: "center" }}>{card.quantity}</Typography>
                    <IconButton
                      size="small"
                      aria-label={`One more ${entry.card.name}`}
                      disabled={disabled}
                      onClick={() => onQuantity(card, card.quantity + 1)}
                    >
                      <AddRounded fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Link
                      component={NextLink}
                      href={`/collection/${entry.id}`}
                      underline="hover"
                      color="inherit"
                      noWrap
                      sx={{ display: "block" }}
                    >
                      {entry.card.name}
                    </Link>
                    <Typography variant="caption" color="text.secondary">
                      {printingLabel(entry.card)} · {entry.condition}
                    </Typography>
                  </Box>
                  <ManaSymbols cost={entry.card.manaCost} />
                  <Tooltip title={`You own ${entry.quantity}; your decks use ${entry.allocated}`}>
                    <Typography
                      variant="caption"
                      color={short ? "warning.main" : "text.secondary"}
                      sx={{ minWidth: 56, textAlign: "right", fontWeight: short ? 600 : undefined }}
                    >
                      {short ? `${-entry.available} short` : `${entry.available} free`}
                    </Typography>
                  </Tooltip>
                </Stack>
              );
            })}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
