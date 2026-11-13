import { render, screen, waitForElementToBeRemoved } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SnackbarProvider, useSnackbar } from "./snackbar-provider";

function Trigger() {
  const show = useSnackbar();
  return <button onClick={() => show("Deck deleted", "info")}>Show</button>;
}

describe("SnackbarProvider", () => {
  it("shows a message until it's closed", async () => {
    render(
      <SnackbarProvider>
        <Trigger />
      </SnackbarProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Deck deleted");

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitForElementToBeRemoved(() => screen.queryByRole("alert"));
  });

  it("complains when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Trigger />)).toThrow("useSnackbar must be used inside SnackbarProvider");
    vi.mocked(console.error).mockRestore();
  });
});
