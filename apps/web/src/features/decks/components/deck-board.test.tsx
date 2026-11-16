import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeCard, makeDeckCard } from "../../../../test/fixtures";
import { renderWithProviders } from "../../../../test/render";
import { DeckBoard } from "./deck-board";

const bolt = makeDeckCard({ card: makeCard({ name: "Lightning Bolt" }), quantity: 4 }, "main", 2);
const goblin = makeDeckCard({ card: makeCard({ name: "Goblin Guide", typeLine: "Creature — Goblin" }) }, "main", 1);
const mountain = makeDeckCard(
  { card: makeCard({ name: "Mountain", typeLine: "Basic Land — Mountain" }), quantity: 10, allocated: 12 },
  "main",
  12,
);

describe("DeckBoard", () => {
  it("groups the main deck by type with counts", () => {
    renderWithProviders(
      <DeckBoard board="main" cards={[bolt, goblin, mountain]} disabled={false} onQuantity={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: "Main deck (15)" })).toBeInTheDocument();
    expect(screen.getByText("Instant (2)")).toBeInTheDocument();
    expect(screen.getByText("Creature (1)")).toBeInTheDocument();
    expect(screen.getByText("Land (12)")).toBeInTheDocument();
  });

  it("changes quantities with the − and + buttons", async () => {
    const onQuantity = vi.fn();
    const { user } = renderWithProviders(
      <DeckBoard board="main" cards={[bolt]} disabled={false} onQuantity={onQuantity} />,
    );

    await user.click(screen.getByRole("button", { name: "One more Lightning Bolt" }));
    await user.click(screen.getByRole("button", { name: "One fewer Lightning Bolt" }));

    expect(onQuantity.mock.calls).toEqual([
      [bolt, 3],
      [bolt, 1],
    ]);
  });

  it("shows free copies, or how many you're short", () => {
    renderWithProviders(<DeckBoard board="main" cards={[bolt, mountain]} disabled={false} onQuantity={vi.fn()} />);
    expect(screen.getByText("4 free")).toBeInTheDocument();
    expect(screen.getByText("2 short")).toBeInTheDocument();
  });

  it("links each card to its collection entry and disables buttons while saving", () => {
    renderWithProviders(<DeckBoard board="side" cards={[bolt]} disabled onQuantity={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Lightning Bolt" })).toHaveAttribute(
      "href",
      `/collection/${bolt.entry.id}`,
    );
    expect(screen.getByRole("button", { name: "One more Lightning Bolt" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "One fewer Lightning Bolt" })).toBeDisabled();
  });

  it("collapses the board and, on the main deck, each type group", async () => {
    const { user } = renderWithProviders(
      <DeckBoard board="main" cards={[bolt, goblin]} disabled={false} onQuantity={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Creature (1)" }));
    expect(screen.queryByRole("link", { name: "Goblin Guide" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lightning Bolt" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Main deck (3)" }));
    expect(screen.getByRole("button", { name: "Main deck (3)" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Lightning Bolt" })).not.toBeInTheDocument();
  });

  it("orders type groups as decklists usually are", () => {
    const enchantment = makeDeckCard({ card: makeCard({ name: "Aura", typeLine: "Enchantment — Aura" }) });
    const other = makeDeckCard({ card: makeCard({ name: "Odd", typeLine: "Kindred" }) });
    renderWithProviders(
      <DeckBoard
        board="main"
        cards={[enchantment, mountain, bolt, other, goblin]}
        disabled={false}
        onQuantity={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Creature (1)",
      "Instant (2)",
      "Enchantment (1)",
      "Land (12)",
      "Other (1)",
    ]);
  });
});
