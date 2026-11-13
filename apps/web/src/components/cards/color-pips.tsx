import type { JSX } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import { symbolUrl } from "./mana-symbols";

/** A colour identity such as "WU" as mana symbols. Empty shows the colourless symbol. */
export function ColorPips({ colors, size = 18 }: { colors: string; size?: number }): JSX.Element {
  const letters = colors ? [...colors] : ["C"];
  return (
    <Box component="span" sx={{ display: "inline-flex", gap: 0.5 }}>
      {letters.map((color) => (
        <Image key={color} src={symbolUrl(color)} alt={color} title={color} width={size} height={size} />
      ))}
    </Box>
  );
}
