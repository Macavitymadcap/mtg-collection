import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeCard, makeEntry } from "../../../../test/fixtures";
import { server } from "../../../../test/msw";
import { renderWithProviders } from "../../../../test/render";
import { AddCardView } from "./add-card-view";

const mirrodin = makeCard({ name: "Great Furnace", setCode: "mrd", setName: "Mirrodin", collectorNumber: "282" });
const planechase = makeCard({ name: "Great Furnace", setCode: "hop", setName: "Planechase", collectorNumber: "133" });

describe("AddCardView", () => {
  it("searches, picks a printing and adds copies", async () => {
    let body: unknown;
    server.use(
      http.get("*/api/catalog/autocomplete", () => HttpResponse.json(["Great Furnace"])),
      http.get("*/api/catalog/printings", () => HttpResponse.json([mirrodin, planechase])),
      http.post("*/api/collection", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(makeEntry({ id: 3, card: planechase, quantity: 2 }), { status: 201 });
      }),
    );
    const { user } = renderWithProviders(<AddCardView />);

    await user.type(screen.getByLabelText("Card name"), "great furn");
    await user.click(await screen.findByRole("option", { name: "Great Furnace" }));
    await user.click(await screen.findByText("Planechase"));
    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText(/Quantity/), "2");
    await user.click(screen.getByRole("button", { name: "Add to collection" }));

    expect(await screen.findByText("Added 2 × Great Furnace")).toBeInTheDocument();
    expect(body).toMatchObject({ scryfallId: planechase.id, quantity: 2, finish: "nonfoil", condition: "NM" });
    // Ready for the next card, with this one listed
    expect(screen.getByLabelText("Card name")).toHaveValue("");
    expect(screen.getByRole("link", { name: /2 × Great Furnace/ })).toHaveAttribute("href", "/collection/3");
  });

  it("says when copies were added to an existing entry", async () => {
    server.use(
      http.get("*/api/catalog/autocomplete", () => HttpResponse.json(["Great Furnace"])),
      http.get("*/api/catalog/printings", () => HttpResponse.json([mirrodin])),
      http.post("*/api/collection", () =>
        HttpResponse.json(makeEntry({ card: mirrodin, quantity: 4 }), { status: 200 }),
      ),
    );
    const { user } = renderWithProviders(<AddCardView />);

    await user.type(screen.getByLabelText("Card name"), "great");
    await user.click(await screen.findByRole("option", { name: "Great Furnace" }));
    await user.click(await screen.findByText("Mirrodin"));
    await user.click(screen.getByRole("button", { name: "Add to collection" }));

    expect(await screen.findByText("Added 1 to your existing Great Furnace: now 4")).toBeInTheDocument();
  });

  it("asks for 2 letters before searching", async () => {
    const autocomplete = vi.fn(() => HttpResponse.json([]));
    server.use(http.get("*/api/catalog/autocomplete", autocomplete));
    const { user } = renderWithProviders(<AddCardView />);

    await user.type(screen.getByLabelText("Card name"), "g");
    expect(await screen.findByText("Type at least 2 letters")).toBeInTheDocument();
    expect(autocomplete).not.toHaveBeenCalled();
  });
});
