import type { CollectionEntry, Page } from "@mtg/shared";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { makeCard, makeEntry } from "../../../../test/fixtures";
import { server } from "../../../../test/msw";
import { renderWithProviders } from "../../../../test/render";
import { router } from "../../../../test/router";
import { CollectionView } from "./collection-view";

const bolt = makeEntry({
  id: 1,
  card: makeCard({ name: "Lightning Bolt", setCode: "m10", collectorNumber: "146", typeLine: "Instant" }),
  quantity: 4,
  allocated: 1,
  signed: true,
  purchasePrice: 1.5,
  currency: "GBP",
});
const forest = makeEntry({
  id: 2,
  card: makeCard({ name: "Forest", typeLine: "Basic Land — Forest", manaCost: null }),
  finish: "foil",
});

function fakeCollection(results: CollectionEntry[] = [bolt, forest], count = results.length) {
  const queries: string[] = [];
  server.use(
    http.get("*/api/collection", ({ request }) => {
      const params = new URL(request.url).searchParams;
      queries.push(params.toString());
      const page: Page<CollectionEntry> = {
        results,
        page: Number(params.get("page")),
        limit: Number(params.get("limit")),
        count,
        totalPages: Math.ceil(count / Number(params.get("limit"))),
      };
      return HttpResponse.json(page);
    }),
  );
  return queries;
}

function setup(searchParams = "") {
  const updates: string[] = [];
  const view = renderWithProviders(<CollectionView />, {
    searchParams,
    onUrlUpdate: (event: UrlUpdateEvent) => updates.push(event.searchParams.toString()),
  });
  return { ...view, updates };
}

describe("CollectionView", () => {
  it("shows the collection as a table and opens an entry on click", async () => {
    fakeCollection();
    const { user } = setup();

    const row = await screen.findByRole("row", { name: /Lightning Bolt/ });
    expect(row).toHaveTextContent("M10 #146");
    expect(row).toHaveTextContent("signed");
    expect(row).toHaveTextContent("£1.50");
    expect(within(row).getByRole("gridcell", { name: "3" })).toBeInTheDocument(); // free copies
    expect(screen.getByText("2 entries")).toBeInTheDocument();

    await user.click(within(row).getByText("Lightning Bolt"));
    expect(router.push).toHaveBeenCalledWith("/collection/1");
  });

  it("asks the API for the filters and sort in the URL", async () => {
    const queries = fakeCollection();
    setup("?search=bolt&colors=R&sort=-manaValue&page=2&limit=25");
    await screen.findByRole("row", { name: /Lightning Bolt/ });
    expect(queries[0]).toBe("page=2&limit=25&sort=-manaValue&search=bolt&colors=R");
  });

  it("sorts by clicking a column header", async () => {
    fakeCollection();
    const { user, updates } = setup();

    await user.click(await screen.findByRole("columnheader", { name: /Cost/ }));
    expect(updates.at(-1)).toBe("sort=manaValue");
  });

  it("switches to the image grid", async () => {
    fakeCollection([bolt, forest], 120);
    const { user, updates } = setup("?view=grid");

    expect(await screen.findByRole("link", { name: /Lightning Bolt/ })).toHaveAttribute("href", "/collection/1");
    expect(screen.getByText("×4")).toBeInTheDocument();
    expect(screen.getByText(/· foil/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    expect(updates.at(-1)).toBe("view=grid&page=2");

    await user.click(screen.getByRole("button", { name: "Table" }));
    expect(updates.at(-1)).toBe("page=2");
  });

  it("says when nothing matches, and shows errors", async () => {
    fakeCollection([]);
    setup("?view=grid");
    expect(await screen.findByText("No cards match.")).toBeInTheDocument();

    server.use(
      http.get("*/api/collection", () => HttpResponse.json({ message: "The API is unavailable" }, { status: 502 })),
    );
    setup();
    expect(await screen.findByText("The API is unavailable")).toBeInTheDocument();
  });

  it("links to adding and importing cards", () => {
    fakeCollection();
    setup();
    expect(screen.getByRole("link", { name: "Add cards" })).toHaveAttribute("href", "/collection/add");
    expect(screen.getByRole("link", { name: "Import" })).toHaveAttribute("href", "/collection/import");
  });
});
