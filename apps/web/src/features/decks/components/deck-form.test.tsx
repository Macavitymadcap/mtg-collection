import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../test/render";
import { DeckForm } from "./deck-form";

describe("DeckForm", () => {
  it("trims the name and turns an empty description into null", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithProviders(
      <DeckForm submitLabel="Create" onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />,
    );

    await user.type(screen.getByLabelText(/Name/), "  Goblins  ");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Goblins", format: "commander", description: null });
  });

  it("needs a name", async () => {
    const onSubmit = vi.fn();
    const { user } = renderWithProviders(
      <DeckForm submitLabel="Create" onSubmit={onSubmit} onCancel={vi.fn()} pending={false} />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Enter a name")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("starts from an existing deck's values", () => {
    renderWithProviders(
      <DeckForm
        defaultValues={{ name: "Burn", format: "modern", description: "Fast" }}
        submitLabel="Save"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        pending={false}
      />,
    );
    expect(screen.getByLabelText(/Name/)).toHaveValue("Burn");
    expect(screen.getByLabelText("Description")).toHaveValue("Fast");
  });
});
