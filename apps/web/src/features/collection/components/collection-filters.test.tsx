import { screen } from "@testing-library/react";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../test/render";
import { CollectionFilters } from "./collection-filters";

function setup(searchParams = "") {
  const updates: URLSearchParams[] = [];
  const onUrlUpdate = vi.fn((event: UrlUpdateEvent) => updates.push(event.searchParams));
  const view = renderWithProviders(<CollectionFilters />, { searchParams, onUrlUpdate });
  const last = () => updates.at(-1)?.toString();
  return { ...view, last };
}

describe("CollectionFilters", () => {
  it("keeps colours in WUBRG order and goes back to page 1 (a default, so it leaves the URL)", async () => {
    const { user, last } = setup("?page=3");

    await user.click(screen.getByRole("button", { name: "Green" }));
    await user.click(screen.getByRole("button", { name: "White" }));

    expect(last()).toBe("colors=WG");
  });

  it("treats colourless as excluding colours, and the reverse", async () => {
    const { user, last } = setup("?colors=WG");

    await user.click(screen.getByRole("button", { name: "Colourless" }));
    expect(last()).toBe("colors=C");

    await user.click(screen.getByRole("button", { name: "Red" }));
    expect(last()).toBe("colors=R");
  });

  it("puts the search in the URL once typing pauses", async () => {
    const { user, last } = setup();
    await user.type(screen.getByLabelText("Search by name"), "bolt");
    await vi.waitFor(() => expect(last()).toBe("search=bolt"), { timeout: 2000 });
  });

  it("filters free copies only, and clears every filter", async () => {
    const { user, last } = setup("?search=bolt&rarity=rare&colors=R");

    await user.click(screen.getByLabelText("Free copies only"));
    expect(last()).toContain("availableOnly=true");

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(last()).toBe("");
    expect(screen.getByLabelText("Search by name")).toHaveValue("");
  });
});
