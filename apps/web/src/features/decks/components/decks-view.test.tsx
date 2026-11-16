import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeDeckSummary } from "../../../../test/fixtures";
import { server } from "../../../../test/msw";
import { renderWithProviders } from "../../../../test/render";
import { router } from "../../../../test/router";
import { DecksView } from "./decks-view";

describe("DecksView", () => {
  it("lists decks with format, size and warnings", async () => {
    server.use(
      http.get("*/api/decks", () =>
        HttpResponse.json([
          makeDeckSummary({
            name: "Goblins",
            cardCount: 100,
            warningCount: 0,
            coverArt: "https://cards.scryfall.io/art_crop/front/k/r/krenko.jpg",
          }),
          makeDeckSummary({ name: "Burn", format: "modern", cardCount: 58, warningCount: 2, description: "Fast" }),
        ]),
      ),
    );
    renderWithProviders(<DecksView />);

    expect(await screen.findByRole("heading", { name: "Goblins" })).toBeInTheDocument();
    expect(screen.getByText("58 cards")).toBeInTheDocument();
    expect(screen.getByText("2 warnings")).toBeInTheDocument();
    expect(screen.getByText("Fast")).toBeInTheDocument();
    // Cover art on the deck that has it (decorative, so no alt text)
    const art = document.querySelectorAll('img[src*="art_crop"]');
    expect(art).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Burn/ })).toHaveAttribute("href", expect.stringMatching(/^\/decks\/\d+$/));
  });

  it("has no New deck button for visitors", async () => {
    server.use(http.get("*/api/decks", () => HttpResponse.json([])));
    renderWithProviders(<DecksView />, { session: null });

    expect(await screen.findByText(/No decks yet/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New deck" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Use New deck/)).not.toBeInTheDocument();
  });

  it("says so when there are no decks", async () => {
    server.use(http.get("*/api/decks", () => HttpResponse.json([])));
    renderWithProviders(<DecksView />);
    expect(await screen.findByText(/No decks yet/)).toBeInTheDocument();
  });

  it("shows the API's error with a retry", async () => {
    server.use(
      http.get("*/api/decks", () => HttpResponse.json({ message: "The API is unavailable" }, { status: 502 })),
    );
    renderWithProviders(<DecksView />);
    expect(await screen.findByText("The API is unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("creates a deck and opens it", async () => {
    let body: unknown;
    server.use(
      http.get("*/api/decks", () => HttpResponse.json([])),
      http.post("*/api/decks", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          { ...makeDeckSummary({ id: 7, name: "Elves" }), cards: [], stats: {}, warnings: [] },
          { status: 201 },
        );
      }),
    );
    const { user } = renderWithProviders(<DecksView />);

    // Wait for the list to load, so the click isn't racing the page
    await screen.findByText("No decks yet");
    await user.click(screen.getByRole("button", { name: "New deck" }));
    await user.type(screen.getByLabelText(/Name/), "Elves");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith("/decks/7"));
    expect(body).toEqual({ name: "Elves", format: "commander", description: null });
  });
});
