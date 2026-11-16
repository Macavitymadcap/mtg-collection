import { Fragment, type JSX, type ReactNode } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import { symbolUrl } from "./mana-symbols";

/** Text with each {X} symbol (tap, mana, energy …) drawn as Scryfall's symbol image, sized to the text. */
function withSymbols(text: string): ReactNode[] {
  return text.split(/(\{[^}]+\})/).map((part, i) => {
    const symbol = /^\{([^}]+)\}$/.exec(part)?.[1];
    if (!symbol) return <Fragment key={i}>{part}</Fragment>;
    return (
      <Image
        key={i}
        src={symbolUrl(symbol)}
        alt={part}
        title={part}
        width={16}
        height={16}
        style={{ width: "1em", height: "1em", verticalAlign: "-0.125em", margin: "0 0.05em" }}
      />
    );
  });
}

/**
 * A card's rules text as printed: symbols as icons, reminder text (in
 * brackets) in italics, and each ability on its own line.
 */
export function RulesText({ text }: { text: string }): JSX.Element {
  return (
    <Box component="span" sx={{ display: "block" }}>
      {text.split("\n").map((line, l) => (
        <Box component="span" key={l} sx={{ display: "block", "& + &": { mt: 1 } }}>
          {line
            .split(/(\([^)]*\))/)
            .map((part, p) =>
              /^\(.*\)$/.test(part) ? (
                <em key={p}>{withSymbols(part)}</em>
              ) : (
                <Fragment key={p}>{withSymbols(part)}</Fragment>
              ),
            )}
        </Box>
      ))}
    </Box>
  );
}
