import type { CollectionStats } from "@mtg/shared";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { makeCard, makeDeckSummary, makeEntry } from "../../../test/fixtures";
import { server } from "../../../test/msw";
import { renderWithProviders } from "../../../test/render";
import { DashboardView } from "./dashboard-view";

const stats = (overrides: Partial<CollectionStats> = {}): CollectionStats => ({
  entries: 297,
  copies: 414,
  uniqueCards: 267,
  decks: 1,
  allocated: 100,
  spent: [
    { currency: "GBP", total: 223.16 },
    { currency: "USD", total: 10 },
  ],
  recent: [makeEntry({ card: makeCard({ name: "Sol Ring", setCode: "pip", collectorNumber: "240" }), quantity: 2 })],
  ...overrides,
});

describe("DashboardView", () => {
  it("shows totals, recent cards and decks", async () => {
    server.use(
      http.get("*/api/stats", () => HttpResponse.json(stats())),
      http.get("*/api/decks", () =>
        HttpResponse.json([makeDeckSummary({ name: "Scrappy Survivors", cardCount: 100, warningCount: 1 })]),
      ),
      http.get("*/api/health", () => HttpResponse.json({ status: "ok", database: "ok" })),
    );
    renderWithProviders(<DashboardView />);

    expect(await screen.findByText("414")).toBeInTheDocument();
    expect(screen.getByText("267")).toBeInTheDocument();
    expect(screen.getByText("100 in 1 deck")).toBeInTheDocument();
    expect(screen.getByText("£223.16 + US$10.00")).toBeInTheDocument();
    expect(screen.getByText("2 × PIP #240")).toBeInTheDocument();
    expect(await screen.findByText("Scrappy Survivors")).toBeInTheDocument();
    expect(screen.getByText("Commander · 100 cards · 1 to check")).toBeInTheDocument();
    expect(await screen.findByText("API and database OK")).toBeInTheDocument();
  });

  it("offers ways to add cards when the collection is empty", async () => {
    server.use(
      http.get("*/api/stats", () => HttpResponse.json(stats({ entries: 0, copies: 0, recent: [], spent: [] }))),
      http.get("*/api/decks", () => HttpResponse.json([])),
      http.get("*/api/health", () => HttpResponse.json({ status: "degraded", database: "unreachable" })),
    );
    renderWithProviders(<DashboardView />);

    expect(await screen.findByText("Your collection is empty")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add cards" })).toHaveAttribute("href", "/collection/add");
    expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute("href", "/collection/import");
    expect(await screen.findByText("Database unreachable")).toBeInTheDocument();
  });
});
