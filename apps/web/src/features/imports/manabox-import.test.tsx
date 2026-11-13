import type { ImportSummary } from "@mtg/shared";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../../../test/msw";
import { renderWithProviders } from "../../../test/render";
import { ManaboxImport } from "./manabox-import";

const summary = (overrides: Partial<ImportSummary> = {}): ImportSummary => ({
  rows: 3,
  copies: 5,
  created: 2,
  merged: 1,
  errors: [],
  dryRun: true,
  deck: null,
  ...overrides,
});

const csvFile = () =>
  new File(["Name,Quantity,Scryfall ID\nShock,1,x"], "ManaBox_Collection.csv", { type: "text/csv" });

describe("ManaboxImport", () => {
  it("previews the file, then imports it when confirmed", async () => {
    const calls: { dryRun: string | null; body: unknown }[] = [];
    server.use(
      http.post("*/api/import/manabox", async ({ request }) => {
        const dryRun = new URL(request.url).searchParams.get("dryRun");
        calls.push({ dryRun, body: await request.json() });
        return HttpResponse.json(summary({ dryRun: dryRun === "true" }));
      }),
    );
    const { user, container } = renderWithProviders(<ManaboxImport />);

    await user.upload(container.querySelector("input[type=file]")!, csvFile());
    expect(await screen.findByText("Ready to import")).toBeInTheDocument();
    expect(
      screen.getByText(/3 rows · 5 copies · 2 new entries · 1 added to entries you already have/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Import 5 copies" }));
    expect(await screen.findByText("Imported")).toBeInTheDocument();

    expect(calls).toEqual([
      { dryRun: "true", body: { csv: "Name,Quantity,Scryfall ID\nShock,1,x" } },
      { dryRun: null, body: { csv: "Name,Quantity,Scryfall ID\nShock,1,x" } },
    ]);
  });

  it("lists bad rows and offers no import", async () => {
    server.use(
      http.post("*/api/import/manabox", () =>
        HttpResponse.json(summary({ errors: [{ line: 7, name: "Shock", message: 'unknown condition "pristine"' }] }), {
          status: 422,
        }),
      ),
    );
    const { user, container } = renderWithProviders(<ManaboxImport />);

    await user.upload(container.querySelector("input[type=file]")!, csvFile());

    expect(await screen.findByText(/1 problem to fix/)).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /7 Shock unknown condition "pristine"/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Import/ })).not.toBeInTheDocument();
  });

  it("shows the API's message for an unusable file", async () => {
    server.use(
      http.post("*/api/import/manabox", () =>
        HttpResponse.json({ message: "This doesn't look like a ManaBox export" }, { status: 400 }),
      ),
    );
    const { user, container } = renderWithProviders(<ManaboxImport />);
    await user.upload(container.querySelector("input[type=file]")!, csvFile());
    expect(await screen.findByText("This doesn't look like a ManaBox export")).toBeInTheDocument();
  });
});
