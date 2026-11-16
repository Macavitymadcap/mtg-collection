import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { navigation } from "../../../test/router";
import { AppShell } from "./app-shell";
import { activeHref, mobileNavItems, navItems } from "./nav-items";

describe("AppShell", () => {
  it("renders the page with a sidebar and a bottom bar (CSS shows one per screen size)", () => {
    const { container } = render(
      <AppShell>
        <p>Page content</p>
      </AppShell>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
    // jsdom applies the CSS that hides one of them at its default width, and hidden elements have
    // no accessible name, so select them by attribute
    const [sidebar, bottomBar] = [...container.querySelectorAll<HTMLElement>('nav[aria-label="Main"]')];
    expect(
      within(sidebar!)
        .getAllByRole("link", { hidden: true })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/collection", "/decks", "/settings/data"]);
    expect(
      within(bottomBar!)
        .getAllByRole("link", { hidden: true })
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/", "/collection", "/collection/add", "/decks", "/settings/data"]);
  });

  it("marks the current page in both", () => {
    navigation.pathname = "/collection/add";
    render(<AppShell>content</AppShell>);

    const current = screen.getAllByRole("link", { current: "page", hidden: true });
    expect(current.map((link) => link.getAttribute("href"))).toEqual(["/collection", "/collection/add"]);
  });
});

describe("activeHref", () => {
  it.each([
    ["/", "/"],
    ["/collection", "/collection"],
    ["/collection/42", "/collection"],
    ["/collection/add", "/collection/add"],
    ["/decks/6", "/decks"],
    ["/collectionist", false],
  ])("matches %s to %s on the bottom bar", (path, expected) => {
    expect(activeHref(path, mobileNavItems)).toBe(expected);
  });

  it("only has the sidebar's own items", () => {
    expect(activeHref("/collection/add", navItems)).toBe("/collection");
  });
});
