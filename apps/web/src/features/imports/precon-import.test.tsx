import type { ImportSummary, PreconSummary } from "@mtg/shared";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw";
import { renderWithProviders } from "../../../test/render";
import { PreconImport } from "./precon-import";

const scrappy: PreconSummary = {
  fileName: "ScrappySurvivors_PIP",
  name: "Scrappy Survivors",
  setCode: "PIP",
  type: "Commander Deck",
  releaseDate: "2024-03-08",
};

function fakeApi(respond: (body: Record<string, unknown>, dryRun: boolean) => ImportSummary) {
  const requests: { body: Record<string, unknown>; dryRun: boolean }[] = [];
  server.use(
    http.get("*/api/catalog/precons", () => HttpResponse.json([scrappy])),
    http.post("*/api/import/precon", async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>;
      const dryRun = new URL(request.url).searchParams.get("dryRun") === "true";
      requests.push({ body, dryRun });
      const summary = respond(body, dryRun);
      return HttpResponse.json(summary, { status: summary.errors.length ? 422 : 200 });
    }),
  );
  return requests;
}

const summary = (overrides: Partial<ImportSummary> = {}): ImportSummary => ({
  rows: 94,
  copies: 100,
  created: 0,
  merged: 94,
  errors: [],
  notes: [],
  dryRun: true,
  deck: { id: null, name: "Scrappy Survivors", format: "commander" },
  ...overrides,
});

async function choose(user: ReturnType<typeof renderWithProviders>["user"]) {
  await user.type(screen.getByLabelText("Product"), "scrappy");
  await user.click(await screen.findByRole("option", { name: /Scrappy Survivors/ }));
}

describe("PreconImport", () => {
  it("adds the cards and creates the deck by default", async () => {
    const requests = fakeApi((_body, dryRun) =>
      summary({
        created: 94,
        merged: 0,
        dryRun,
        deck: { id: dryRun ? null : 5, name: "Scrappy Survivors", format: "commander" },
      }),
    );
    const { user } = renderWithProviders(<PreconImport />);

    await choose(user);
    expect(await screen.findByText("Ready to import")).toBeInTheDocument();
    expect(screen.getByText(/Creates the commander deck “Scrappy Survivors”/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import 100 cards" }));
    expect(await screen.findByRole("link", { name: "Open deck" })).toHaveAttribute("href", "/decks/5");

    expect(requests.at(-1)).toEqual({
      body: { fileName: "ScrappySurvivors_PIP", createDeck: true, useOwnedCards: false, deckName: "Scrappy Survivors" },
      dryRun: false,
    });
  });

  it("builds the deck from owned cards, listing substitutions", async () => {
    const requests = fakeApi((body) =>
      summary({
        notes: body.useOwnedCards
          ? [{ line: 2, name: "Sol Ring", message: "Uses your C21 #263 printing (the product's is PIP #240)" }]
          : [],
      }),
    );
    const { user } = renderWithProviders(<PreconImport />);

    await choose(user);
    await user.click(screen.getByLabelText(/I already own these cards/));

    expect(await screen.findByText("Ready to build")).toBeInTheDocument();
    expect(screen.getByText(/100 cards from 94 of your collection entries · no copies added/)).toBeInTheDocument();
    expect(await screen.findByText(/Sol Ring: uses your C21 #263 printing/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Also create a deck from it")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create deck" })).toBeInTheDocument();
    expect(requests.at(-1)?.body).toMatchObject({ createDeck: true, useOwnedCards: true });
  });

  it("imports with the deck name as typed, even before the preview catches up", async () => {
    const requests = fakeApi((_body, dryRun) => summary({ dryRun }));
    const { user } = renderWithProviders(<PreconImport />);

    await choose(user);
    await screen.findByText("Ready to import");
    await user.clear(screen.getByLabelText("Deck name"));
    await user.type(screen.getByLabelText("Deck name"), "Dogmeat");
    await user.click(screen.getByRole("button", { name: "Import 100 cards" }));

    await screen.findByText(/Imported/);
    expect(requests.find((r) => !r.dryRun)?.body).toMatchObject({ deckName: "Dogmeat" });
  });

  it("can add the cards without a deck", async () => {
    const requests = fakeApi(() => summary({ deck: null }));
    const { user } = renderWithProviders(<PreconImport />);

    await choose(user);
    await user.click(screen.getByLabelText("Also create a deck from it"));

    expect(screen.queryByLabelText("Deck name")).not.toBeInTheDocument();
    await screen.findByText("Ready to import");
    expect(requests.at(-1)?.body).toEqual({
      fileName: "ScrappySurvivors_PIP",
      createDeck: false,
      useOwnedCards: false,
    });
  });

  it("shows what's missing and the taken deck name", async () => {
    fakeApi(() =>
      summary({
        errors: [
          {
            line: 0,
            name: "Scrappy Survivors",
            message: 'There\'s already a deck called "Scrappy Survivors". Choose another name.',
          },
          { line: 3, name: "Forest", message: "you own 5 copies (any printing); the deck needs 9" },
        ],
      }),
    );
    const { user } = renderWithProviders(<PreconImport />);

    await choose(user);
    await user.click(screen.getByLabelText(/I already own these cards/));

    expect(await screen.findByText(/2 problems to fix/)).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /— Scrappy Survivors There's already a deck/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /3 Forest you own 5 copies/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create deck" })).not.toBeInTheDocument();
  });
});
