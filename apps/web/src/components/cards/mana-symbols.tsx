import type { JSX } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";

/** Scryfall's SVG for a symbol such as "W", "2", "W/U" or "T". */
export function symbolUrl(symbol: string): string {
  return `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(symbol.replaceAll("/", ""))}.svg`;
}

interface ManaSymbolsProps {
  /** A mana cost as Scryfall writes it, e.g. "{2}{W}{W}". Double-faced cards use " // ". */
  cost: string | null;
  size?: number;
}

/** Renders a mana cost with Scryfall's symbol images. */
export function ManaSymbols({ cost, size = 16 }: ManaSymbolsProps): JSX.Element | null {
  if (!cost) return null;
  const faces = cost.split(" // ");

  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
      {faces.map((face, f) => (
        <Box component="span" key={f} sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          {f > 0 && <Box component="span" sx={{ mx: 1, color: "text.secondary" }}>{"//"}</Box>}
          {[...face.matchAll(/\{([^}]+)\}/g)].map(([text, symbol], i) => (
            <Image key={i} src={symbolUrl(symbol ?? "")} alt={text} title={text} width={size} height={size} />
          ))}
        </Box>
      ))}
    </Box>
  );
}
