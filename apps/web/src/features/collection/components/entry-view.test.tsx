import type { CollectionEntryDetail } from "@mtg/shared";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeCard, makeEntry } from "../../../../test/fixtures";
import { server } from "../../../../test/msw";
import { renderWithProviders } from "../../../../test/render";
import { router } from "../../../../test/router";
import { EntryView } from "./entry-view";

const furnace = makeCard({
  name: "Great Furnace",
  setCode: "mrd",
  setName: "Mirrodin",
  collectorNumber: "282",
  manaCost: null,
  typeLine: "Artifact Land",
});
const reprint = makeCard({
  ...furnace,
  id: "20000000-0000-4000-8000-000000000001",
  setCode: "hop",
  setName: "Planechase",
  collectorNumber: "133",
});

function detail(overrides: Partial<CollectionEntryDetail> = {}): CollectionEntryDetail {
  return { ...makeEntry({ id: 5, card: furnace, quantity: 2 }), usages: [], ...overrides };
}

describe("EntryView", () => {
  it("shows the card, its copies and the decks using it", async () => {
    server.use(
      http.get("*/api/collection/5", () =>
        HttpResponse.json(detail({ usages: [{ deckId: 3, deckName: "Artifacts", board: "main", quantity: 1 }] })),
      ),
    );
    renderWithProviders(<EntryView id={5} />);

    expect(await screen.findByRole("heading", { name: "Great Furnace" })).toBeInTheDocument();
    expect(screen.getByText("Mirrodin · MRD #282")).toBeInTheDocument();
    expect(screen.getByLabelText(/Quantity/)).toHaveValue(2);
    expect(screen.getByRole("link", { name: "Artifacts" })).toHaveAttribute("href", "/decks/3");
  });

  it("saves edits", async () => {
    let body: unknown;
    server.use(
      http.get("*/api/collection/5", () => HttpResponse.json(detail())),
      http.patch("*/api/collection/5", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(detail({ condition: "LP", updatedAt: "2026-11-14T00:00:00.000Z" }));
      }),
    );
    const { user } = renderWithProviders(<EntryView id={5} />);

    await user.click(await screen.findByLabelText("Signed"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Saved")).toBeInTheDocument();
    expect(body).toMatchObject({ quantity: 2, signed: true });
  });

  it("moves to the merged entry when a printing change makes it a duplicate", async () => {
    let body: unknown;
    server.use(
      http.get("*/api/collection/5", () => HttpResponse.json(detail())),
      http.get("*/api/catalog/printings", () => HttpResponse.json([furnace, reprint])),
      http.patch("*/api/collection/5", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeEntry({ id: 9, card: reprint, quantity: 5 }));
      }),
    );
    const { user } = renderWithProviders(<EntryView id={5} />);

    await user.click(await screen.findByRole("button", { name: "Change printing" }));
    const dialog = screen.getByRole("dialog");
    await user.click(await within(dialog).findByText("Planechase"));

    await vi.waitFor(() => expect(router.replace).toHaveBeenCalledWith("/collection/9"));
    expect(body).toEqual({ scryfallId: reprint.id });
    expect(await screen.findByText("Merged with an identical entry: you now have 5")).toBeInTheDocument();
  });

  it("confirms before deleting, and shows why a delete was refused", async () => {
    server.use(
      http.get("*/api/collection/5", () => HttpResponse.json(detail())),
      http.delete("*/api/collection/5", () =>
        HttpResponse.json({ message: "Used in Artifacts. Remove it from that deck first." }, { status: 409 }),
      ),
    );
    const { user } = renderWithProviders(<EntryView id={5} />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = screen.getByRole("dialog", { name: "Delete Great Furnace?" });
    expect(dialog).toHaveTextContent("This removes all 2 copies in this entry");

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await within(dialog).findByText("Used in Artifacts. Remove it from that deck first.")).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("deletes and returns to the collection", async () => {
    server.use(
      http.get("*/api/collection/5", () => HttpResponse.json(detail())),
      http.delete("*/api/collection/5", () => new HttpResponse(null, { status: 204 })),
    );
    const { user } = renderWithProviders(<EntryView id={5} />);

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await vi.waitFor(() => expect(router.push).toHaveBeenCalledWith("/collection"));
  });

  it("explains a missing entry", async () => {
    server.use(
      http.get("*/api/collection/5", () => HttpResponse.json({ message: "No collection entry 5" }, { status: 404 })),
    );
    renderWithProviders(<EntryView id={5} />);
    expect(await screen.findByText("No collection entry 5")).toBeInTheDocument();
  });
});
