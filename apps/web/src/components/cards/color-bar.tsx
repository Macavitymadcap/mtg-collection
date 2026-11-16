import type { JSX } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { ManaColor } from "@/theme/theme";

const order: ManaColor[] = ["W", "U", "B", "R", "G", "C"];
const names: Record<ManaColor, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colourless" };

/** A stacked bar of card counts per colour, in WUBRG order then colourless. */
export function ColorBar({ counts }: { counts: Record<string, number> }): JSX.Element | null {
  const parts = order.filter((color) => (counts[color] ?? 0) > 0);
  const total = parts.reduce((sum, color) => sum + (counts[color] ?? 0), 0);
  if (!total) return null;

  return (
    <Stack
      direction="row"
      role="img"
      aria-label={parts.map((color) => `${names[color]} ${counts[color]}`).join(", ")}
      sx={{ height: 10, borderRadius: 5, overflow: "hidden", gap: "2px" }}
    >
      {parts.map((color) => (
        <Tooltip key={color} title={`${names[color]}: ${counts[color]}`} describeChild>
          <Box sx={{ flexGrow: counts[color], bgcolor: `mana.${color}` }} />
        </Tooltip>
      ))}
    </Stack>
  );
}

/** A thin band in a deck's colours, e.g. along the top of a deck tile. Colourless shows grey. */
export function IdentityStripe({ colors }: { colors: string }): JSX.Element {
  const letters = (colors ? [...colors] : ["C"]) as ManaColor[];
  return (
    <Stack direction="row" aria-hidden sx={{ height: 6 }}>
      {letters.map((color) => (
        <Box key={color} sx={{ flexGrow: 1, bgcolor: `mana.${color}` }} />
      ))}
    </Stack>
  );
}
