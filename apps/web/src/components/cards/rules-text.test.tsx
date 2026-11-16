import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RulesText } from "./rules-text";

// Dogmeat, Ever Loyal's rules text, as Scryfall stores it
const DOGMEAT =
  "When Dogmeat enters, mill five cards, then return an Aura or Equipment card from your graveyard to your hand.\n" +
  "Whenever a creature you control that's enchanted or equipped attacks, create a Junk token. (It's an artifact with \"{T}, Sacrifice this token: Exile the top card of your library. You may play that card this turn. Activate only as a sorcery.\")";

describe("RulesText", () => {
  it("draws symbols as images, including inside reminder text", () => {
    render(<RulesText text={DOGMEAT} />);
    const tap = screen.getByRole("img", { name: "{T}" });
    expect(tap).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/T.svg");
    expect(screen.queryByText(/\{T\}/)).not.toBeInTheDocument();
  });

  it("italicises reminder text and keeps each ability on its own line", () => {
    const { container } = render(<RulesText text={DOGMEAT} />);
    const lines = container.firstElementChild?.children;
    expect(lines).toHaveLength(2);
    const reminder = container.querySelector("em");
    expect(reminder?.textContent).toMatch(/^\(It's an artifact with ".*, Sacrifice this token/);
    expect(lines?.[1]?.textContent).toMatch(/^Whenever a creature you control/);
  });

  it("handles mana and hybrid symbols in costs within the text", () => {
    render(<RulesText text="{2}{W/U}, {T}: Draw a card." />);
    expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(["{2}", "{W/U}", "{T}"]);
    expect(screen.getByText(/: Draw a card\./)).toBeInTheDocument();
  });
});
