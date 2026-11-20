"use client";

import { useState, type JSX } from "react";
import NextLink from "next/link";
import { labels, primaryType, type Board, type DeckCard } from "@mtg/shared";
import AddRounded from "@mui/icons-material/AddRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { CardPreview } from "@/components/cards/card-preview";
import { ManaSymbols } from "@/components/cards/mana-symbols";
import { printingLabel } from "@/lib/format";

interface DeckBoardProps {
  board: Board;
  cards: DeckCard[];
  disabled: boolean;
  onQuantity: (card: DeckCard, quantity: number) => void;
  /** Show quantities without the buttons that change them, for visitors. */
  readOnly?: boolean;
  /** Section keys (see sectionKeys) that are collapsed. Everything is open if not given. */
  collapsed?: ReadonlySet<string>;
  onToggle?: (key: string) => void;
  /** False to open and close sections instantly, e.g. while restoring saved state. */
  animate?: boolean;
}

const sum = (cards: DeckCard[]): number => cards.reduce((total, card) => total + card.quantity, 0);

/**
 * A board's cards in groups: the main deck by card type (it's long), other
 * boards as one group.
 */
export function groupDeckCards(board: Board, cards: DeckCard[]): Map<string, DeckCard[]> {
  const groups = new Map<string, DeckCard[]>();
  for (const card of cards) {
    const group = board === "main" ? primaryType(card.entry.card.typeLine) : labels.board[board];
    groups.set(group, [...(groups.get(group) ?? []), card]);
  }
  // The usual decklist order, rather than whichever type's first card comes first alphabetically
  const rank = (group: string) => (TYPE_ORDER.indexOf(group) + TYPE_ORDER.length + 1) % (TYPE_ORDER.length + 1);
  return new Map([...groups].sort(([a], [b]) => rank(a) - rank(b)));
}

const TYPE_ORDER = ["Creature", "Planeswalker", "Battle", "Instant", "Sorcery", "Artifact", "Enchantment", "Land"];

/** The collapsible sections of a board: the board itself, then each type group in the main deck. */
export function sectionKeys(board: Board, cards: DeckCard[]): string[] {
  const groups = board === "main" ? [...groupDeckCards(board, cards).keys()].map((group) => `${board}:${group}`) : [];
  return [board, ...groups];
}

/** One board of a deck as a collapsible section; the main deck's type groups collapse too. */
export function DeckBoard({
  board,
  cards,
  disabled,
  onQuantity,
  readOnly = false,
  collapsed,
  onToggle,
  animate = true,
}: DeckBoardProps): JSX.Element {
  const transition = { unmountOnExit: true, ...(animate ? {} : { timeout: 0 }) };
  // Uncontrolled unless the parent manages which sections are open
  const [ownCollapsed, setOwnCollapsed] = useState<ReadonlySet<string>>(new Set());
  const closed = collapsed ?? ownCollapsed;
  const toggle =
    onToggle ??
    ((key: string) =>
      setOwnCollapsed((current) => {
        const next = new Set(current);
        if (!next.delete(key)) next.add(key);
        return next;
      }));
  const groups = groupDeckCards(board, cards);

  const renderRows = (groupCards: DeckCard[]) => (
    <Box>
      {groupCards.map((card) => {
        const { entry } = card;
        const short = entry.available < 0;
        return (
          <Stack
            key={entry.id}
            direction="row"
            sx={{ alignItems: "center", gap: 2, py: 0.5, borderBottom: 1, borderColor: "divider" }}
          >
            {readOnly ? (
              <Typography sx={{ minWidth: 24, textAlign: "center" }}>{card.quantity}</Typography>
            ) : (
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
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <CardPreview card={entry.card}>
                <Link
                  component={NextLink}
                  href={`/collection/${entry.id}`}
                  underline="hover"
                  color="inherit"
                  // Phones: let long names wrap rather than cutting them off
                  sx={{
                    // Only as wide as the name, so the hover preview opens beside it
                    display: "inline-block",
                    maxWidth: "100%",
                    verticalAlign: "top",
                    whiteSpace: { md: "nowrap" },
                    overflow: { md: "hidden" },
                    textOverflow: { md: "ellipsis" },
                  }}
                >
                  {entry.card.name}
                </Link>
              </CardPreview>
              <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
                <Typography variant="caption" color="text.secondary">
                  {printingLabel(entry.card)} · {entry.condition}
                </Typography>
                {/* Under the name on phones, where the row is too narrow for its own column */}
                <Box sx={{ display: { xs: "inline-flex", md: "none" } }}>
                  <ManaSymbols cost={entry.card.manaCost} size={14} />
                </Box>
              </Stack>
            </Box>
            <Box sx={{ display: { xs: "none", md: "inline-flex" } }}>
              <ManaSymbols cost={entry.card.manaCost} />
            </Box>
            <Tooltip title={`You own ${entry.quantity}; your decks use ${entry.allocated}`} describeChild>
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
  );

  return (
    <Accordion
      expanded={!closed.has(board)}
      onChange={() => toggle(board)}
      disableGutters
      slotProps={{ heading: { component: "h2" }, transition }}
    >
      <AccordionSummary expandIcon={<ExpandMoreRounded />} aria-controls={`${board}-cards`} id={`${board}-heading`}>
        <Typography variant="h6" component="span">
          {labels.board[board]}{" "}
          <Typography component="span" color="text.secondary">
            ({sum(cards)})
          </Typography>
        </Typography>
      </AccordionSummary>
      <AccordionDetails id={`${board}-cards`} sx={{ pt: 0 }}>
        {board === "main" ? (
          <Stack sx={{ gap: 1 }}>
            {[...groups].map(([group, groupCards]) => {
              const key = `${board}:${group}`;
              return (
                <Accordion
                  key={group}
                  expanded={!closed.has(key)}
                  onChange={() => toggle(key)}
                  disableGutters
                  elevation={0}
                  square
                  slotProps={{ heading: { component: "h3" }, transition }}
                  sx={{ border: 0, "&::before": { display: "none" } }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreRounded fontSize="small" />}
                    sx={{ minHeight: 36, px: 0, "& .MuiAccordionSummary-content": { my: 0.5 } }}
                  >
                    <Typography variant="overline" color="text.secondary">
                      {group} ({sum(groupCards)})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>{renderRows(groupCards)}</AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        ) : (
          renderRows(cards)
        )}
      </AccordionDetails>
    </Accordion>
  );
}
