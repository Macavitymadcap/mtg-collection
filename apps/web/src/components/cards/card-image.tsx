import type { JSX } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Card } from "@mtg/shared";

interface CardImageProps {
  card: Pick<Card, "name" | "imageSmall" | "imageNormal">;
  /** "small" for thumbnails and grids, "normal" for a large view. */
  size?: "small" | "normal";
  priority?: boolean;
}

// Scryfall's image sizes; both are the same 5:7 shape as a card
const dimensions = { small: { width: 146, height: 204 }, normal: { width: 488, height: 680 } };

/** A card's picture, scaled to the width of its container. */
export function CardImage({ card, size = "small", priority }: CardImageProps): JSX.Element {
  const src = size === "small" ? (card.imageSmall ?? card.imageNormal) : (card.imageNormal ?? card.imageSmall);
  const { width, height } = dimensions[size];

  if (!src) {
    return (
      <Box
        sx={{
          aspectRatio: "5 / 7",
          borderRadius: "4.75% / 3.5%",
          bgcolor: "action.hover",
          display: "grid",
          placeItems: "center",
          p: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {card.name}
        </Typography>
      </Box>
    );
  }

  return (
    <Image
      src={src}
      alt={card.name}
      width={width}
      height={height}
      priority={priority}
      style={{ width: "100%", height: "auto", borderRadius: "4.75% / 3.5%", display: "block" }}
    />
  );
}
