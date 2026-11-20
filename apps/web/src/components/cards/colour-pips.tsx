import type { JSX } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import { symbolUrl } from "./mana-symbols";

/** A colour identity such as "WU" as mana symbols. Empty shows the colourless symbol. */
export function ColourPips({ colours, size = 18 }: { colours: string; size?: number }): JSX.Element {
  const letters = colours ? [...colours] : ["C"];
  return (
    <Box component="span" sx={{ display: "inline-flex", gap: 0.5 }}>
      {letters.map((colour) => (
        <Image key={colour} src={symbolUrl(colour)} alt={colour} title={colour} width={size} height={size} />
      ))}
    </Box>
  );
}
