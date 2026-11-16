"use client";

import type { JSX, ReactElement } from "react";
import type { Card } from "@mtg/shared";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { CardImage } from "./card-image";

interface CardPreviewProps {
  card: Pick<Card, "name" | "imageSmall" | "imageNormal">;
  /** What to attach the preview to, e.g. the card's name. Must accept a ref. */
  children: ReactElement;
}

/**
 * Shows the card's image when hovering over its name on desktop, or after a
 * long press on a phone (the Tooltip's touch handling). Cards without an image
 * get no preview.
 */
export function CardPreview({ card, children }: CardPreviewProps): JSX.Element {
  if (!card.imageNormal && !card.imageSmall) return children;

  return (
    <Tooltip
      title={
        <Box sx={{ width: 244 }}>
          <CardImage card={card} size="normal" />
        </Box>
      }
      placement="right"
      enterDelay={300}
      enterNextDelay={150}
      enterTouchDelay={400}
      leaveTouchDelay={3000}
      describeChild
      slotProps={{
        tooltip: { sx: { p: 0, bgcolor: "transparent", maxWidth: "none", boxShadow: 8, borderRadius: "4.75% / 3.5%" } },
      }}
    >
      {children}
    </Tooltip>
  );
}
