import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResponseError } from "up-fetch";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./page-states";

describe("page states", () => {
  it.each(["tiles", "cards", "detail", "block"] as const)("marks the %s placeholder as loading", (shape) => {
    render(<LoadingState shape={shape} count={2} />);
    expect(screen.getByLabelText("Loading")).toHaveAttribute("aria-busy", "true");
  });

  it("shows an empty state with its next step", () => {
    render(<EmptyState title="No decks yet" message="Create one." action={<button>New deck</button>} />);
    expect(screen.getByRole("heading", { name: "No decks yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New deck" })).toBeInTheDocument();
  });

  it("shows the API's message, or the fallback, with a retry", async () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ErrorState
        error={new ResponseError({ message: "x", status: 502, data: { message: "The API is unavailable" } })}
        fallback="Could not load."
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("The API is unavailable");
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();

    rerender(<ErrorState error={new Error("boom")} fallback="Could not load." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
