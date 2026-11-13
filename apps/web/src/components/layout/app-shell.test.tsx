import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders the page with navigation to every section", () => {
    render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
    // Rendered twice (drawer for small screens, permanent for large), so take the first
    const nav = screen.getAllByRole("navigation", { name: "Main" })[0]!;
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/collection", "/decks", "/settings/data"]);
  });

  it("opens the navigation drawer on small screens", async () => {
    const { container } = render(<AppShell>content</AppShell>);
    // The test window is desktop-sized, where CSS hides this button, and hidden
    // elements have no accessible name, so select it by its label attribute
    const button = container.querySelector<HTMLButtonElement>('button[aria-label="Open navigation"]')!;
    // The drawer (also hidden at this width) only mounts its copy of the navigation when open
    expect(screen.getAllByRole("navigation", { hidden: true })).toHaveLength(1);
    await userEvent.click(button);
    expect(screen.getAllByRole("navigation", { hidden: true })).toHaveLength(2);
  });
});
