import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import NotFound from "./not-found";

describe("error pages", () => {
  it("offers to retry after an error, logging it", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const retry = vi.fn();
    const error = new Error("boom");
    render(<ErrorPage error={error} retry={retry} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(error);
    consoleError.mockRestore();
  });

  it("points lost visitors back to the collection and decks", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your collection" })).toHaveAttribute("href", "/collection");
    expect(screen.getByRole("link", { name: "Your decks" })).toHaveAttribute("href", "/decks");
  });
});
