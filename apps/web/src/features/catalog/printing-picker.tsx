"use client";

import type { JSX } from "react";
import type { Card } from "@mtg/shared";
import Alert from "@mui/material/Alert";
import ButtonBase from "@mui/material/ButtonBase";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import { CardImage } from "@/components/cards/card-image";
import { errorMessage } from "@/lib/errors";
import { printingLabel } from "@/lib/format";
import { usePrintings } from "./queries";

interface PrintingPickerProps {
  name: string;
  selectedId: string | null;
  onSelect: (card: Card) => void;
}

/** Every printing of a card as images, oldest first. Click one to choose it. */
export function PrintingPicker({ name, selectedId, onSelect }: PrintingPickerProps): JSX.Element {
  const { data: printings, isPending, isError, error } = usePrintings(name);

  if (isPending) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 6 }, (_, i) => (
          <Grid key={i} size={{ xs: 4, sm: 3, md: 2 }}>
            <Skeleton variant="rounded" sx={{ aspectRatio: "5 / 7", height: "auto" }} />
          </Grid>
        ))}
      </Grid>
    );
  }
  if (isError) return <Alert severity="error">{errorMessage(error, "Could not load printings.")}</Alert>;
  if (printings.length === 0) return <Typography color="text.secondary">No printings found.</Typography>;

  return (
    <Grid container spacing={3}>
      {printings.map((card) => {
        const selected = card.id === selectedId;
        return (
          <Grid key={card.id} size={{ xs: 4, sm: 3, md: 2 }}>
            <ButtonBase
              onClick={() => onSelect(card)}
              aria-pressed={selected}
              sx={{
                display: "block",
                width: "100%",
                textAlign: "left",
                borderRadius: 2,
                p: 1,
                outline: selected ? 3 : 0,
                outlineColor: "primary.main",
                bgcolor: selected ? "action.selected" : undefined,
              }}
            >
              <CardImage card={card} />
              <Typography variant="body2" sx={{ mt: 1 }} noWrap title={card.setName}>
                {card.setName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {printingLabel(card)}
              </Typography>
            </ButtonBase>
          </Grid>
        );
      })}
    </Grid>
  );
}
