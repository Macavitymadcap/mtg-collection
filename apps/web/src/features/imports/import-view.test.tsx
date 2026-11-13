import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw";
import { renderWithProviders } from "../../../test/render";
import { ImportView } from "./import-view";

describe("ImportView", () => {
  it("starts on ManaBox and switches tabs through the URL", async () => {
    server.use(http.get("*/api/catalog/precons", () => HttpResponse.json([])));
    const updates: string[] = [];
    const { user } = renderWithProviders(<ImportView />, {
      onUrlUpdate: (event: UrlUpdateEvent) => updates.push(event.searchParams.toString()),
    });

    expect(screen.getByRole("tab", { name: "ManaBox export", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose CSV file" })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Preconstructed deck" }));
    expect(updates.at(-1)).toBe("source=precon");
    expect(screen.getByLabelText("Product")).toBeInTheDocument();
  });

  it("opens on the tab named in the URL", () => {
    server.use(http.get("*/api/catalog/precons", () => HttpResponse.json([])));
    renderWithProviders(<ImportView />, { searchParams: "?source=precon" });
    expect(screen.getByRole("tab", { name: "Preconstructed deck", selected: true })).toBeInTheDocument();
  });
});
