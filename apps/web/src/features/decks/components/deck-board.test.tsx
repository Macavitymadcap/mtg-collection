import { screen, within } from "@testing-library/react";
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
    for (const button of within(screen.getByRole("heading", { name: /Sideboard/ }).parentElement!).getAllByRole(
      "button",
    )) {
      expect(button).toBeDisabled();
    }
  });
});
