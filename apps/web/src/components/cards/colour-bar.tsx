import type { JSX } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import type { ManaColour } from "@/theme/theme";

const order: ManaColour[] = ["W", "U", "B", "R", "G", "C"];
const names: Record<ManaColour, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colourless" };

/** A stacked bar of card counts per colour, in WUBRG order then colourless. */
export function ColourBar({ counts }: { counts: Record<string, number> }): JSX.Element | null {
  const parts = order.filter((colour) => (counts[colour] ?? 0) > 0);
  const total = parts.reduce((sum, colour) => sum + (counts[colour] ?? 0), 0);
  if (!total) return null;

  return (
    <Stack
      direction="row"
      role="img"
      aria-label={parts.map((colour) => `${names[colour]} ${counts[colour]}`).join(", ")}
      sx={{ height: 10, borderRadius: 5, overflow: "hidden", gap: "2px" }}
    >
      {parts.map((colour) => (
        <Tooltip key={colour} title={`${names[colour]}: ${counts[colour]}`} describeChild>
          <Box sx={{ flexGrow: counts[colour], bgcolor: `mana.${colour}` }} />
        </Tooltip>
      ))}
    </Stack>
  );
}

/** A thin band in a deck's colours, e.g. along the top of a deck tile. Colourless shows grey. */
export function IdentityStripe({ colours }: { colours: string }): JSX.Element {
  const letters = (colours ? [...colours] : ["C"]) as ManaColour[];
  return (
    <Stack direction="row" aria-hidden sx={{ height: 6 }}>
      {letters.map((colour) => (
        <Box key={colour} sx={{ flexGrow: 1, bgcolor: `mana.${colour}` }} />
      ))}
    </Stack>
  );
}
