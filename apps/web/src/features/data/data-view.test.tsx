import type { BackupImportSummary, DataCounts } from "@mtg/shared";
import { screen, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../../../test/msw";
import { renderWithProviders } from "../../../test/render";
import { DataView } from "./data-view";

const counts = (entries: number, decks: number): DataCounts => ({
  cards: entries,
  entries,
  copies: entries * 2,
  decks,
  deckCards: decks * 10,
});

const jsonFile = (content: string) => new File([content], "backup.json", { type: "application/json" });

function fakeApi(importResponse: (dryRun: boolean) => Response) {
  const imports: boolean[] = [];
  server.use(
    http.get("*/api/data/counts", () => HttpResponse.json(counts(297, 1))),
    http.post("*/api/data/import", ({ request }) => {
      const dryRun = new URL(request.url).searchParams.get("dryRun") === "true";
      imports.push(dryRun);
      return importResponse(dryRun);
    }),
  );
  return imports;
}

describe("DataView", () => {
  it("shows what's in the database", async () => {
    fakeApi(() => HttpResponse.json({}));
    renderWithProviders(<DataView />);
    expect(await screen.findByText(/Currently 297 entries \(594 copies\) and 1 deck\./)).toBeInTheDocument();
  });

  it("downloads the export as a dated JSON file", async () => {
    fakeApi(() => HttpResponse.json({}));
    server.use(
      http.get("*/api/data/export", () =>
        HttpResponse.json({
          formatVersion: 1,
          exportedAt: "2026-11-13T16:00:00.000Z",
          cards: [],
          collection: [],
          decks: [],
        }),
      ),
    );
    const createObjectURL = vi.fn(() => "blob:export");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const { user } = renderWithProviders(<DataView />);

    await user.click(screen.getByRole("button", { name: "Export JSON" }));

    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe("mtg-collection-2026-11-13.json");
    expect(link.href).toBe("blob:export");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:export");
    click.mockRestore();
  });

  it("checks a file, compares it and replaces everything only after confirming", async () => {
    const imports = fakeApi((dryRun) =>
      HttpResponse.json({ incoming: counts(10, 2), replaced: counts(297, 1), dryRun } satisfies BackupImportSummary),
    );
    const { user, container } = renderWithProviders(<DataView />);

    await user.upload(container.querySelector("input[type=file]")!, jsonFile('{"formatVersion":1}'));

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("row", { name: "Collection entries 297 10" })).toBeInTheDocument();
    expect(imports).toEqual([true]);

    await user.click(screen.getByRole("button", { name: "Replace everything" }));
    const dialog = screen.getByRole("dialog", { name: "Replace everything?" });
    expect(dialog).toHaveTextContent(
      "This deletes your 297 entries (594 copies) and 1 deck, and loads 10 entries (20 copies) and 2 decks from backup.json.",
    );

    await user.click(within(dialog).getByRole("button", { name: "Replace everything" }));
    expect(await screen.findByText("Loaded 10 entries (20 copies) and 2 decks")).toBeInTheDocument();
    expect(imports).toEqual([true, false]);
  });

  it("lists the problems in an invalid file", async () => {
    fakeApi(() =>
      HttpResponse.json(
        {
          name: "BadRequest",
          message: "This isn't a valid export file",
          details: [{ path: "decks.0.cards.94.collectionRef", message: "Unknown collection ref c999" }],
        },
        { status: 400 },
      ),
    );
    const { user, container } = renderWithProviders(<DataView />);

    await user.upload(container.querySelector("input[type=file]")!, jsonFile("{}"));

    expect(await screen.findByText("This isn't a valid export file")).toBeInTheDocument();
    expect(screen.getByText("decks.0.cards.94.collectionRef")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Replace everything" })).not.toBeInTheDocument();
  });

  it("says when the file isn't JSON, without calling the API", async () => {
    const imports = fakeApi(() => HttpResponse.json({}));
    const { user, container } = renderWithProviders(<DataView />);

    await user.upload(container.querySelector("input[type=file]")!, jsonFile("not json"));

    expect(await screen.findByText("backup.json isn't a JSON file.")).toBeInTheDocument();
    expect(imports).toEqual([]);
  });
});
