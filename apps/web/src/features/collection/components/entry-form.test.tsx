import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../../test/render";
import { screen } from "@testing-library/react";
import { EntryForm, emptyEntryForm } from "./entry-form";

function setup(defaults = emptyEntryForm) {
  const onSubmit = vi.fn();
  const view = renderWithProviders(
    <EntryForm defaultValues={defaults} submitLabel="Save" onSubmit={onSubmit} pending={false} />,
  );
  return { ...view, onSubmit };
}

describe("EntryForm", () => {
  it("submits API-ready values: price as a number, codes normalised, empty notes as null", async () => {
    const { user, onSubmit } = setup();

    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText(/Quantity/), "3");
    await user.type(screen.getByLabelText("Price paid (each)"), "2.5");
    await user.clear(screen.getByLabelText("Currency"));
    await user.type(screen.getByLabelText("Currency"), "usd");
    await user.clear(screen.getByLabelText("Language"));
    await user.type(screen.getByLabelText("Language"), "JA");
    await user.click(screen.getByLabelText("Signed"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      quantity: 3,
      finish: "nonfoil",
      condition: "NM",
      language: "ja",
      signed: true,
      altered: false,
      misprint: false,
      proxy: false,
      purchasePrice: 2.5,
      currency: "USD",
      notes: null,
    });
  });

  it("drops the currency when there's no price", async () => {
    const { user, onSubmit } = setup();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ purchasePrice: null, currency: null }));
  });

  it("explains what's wrong instead of submitting", async () => {
    const { user, onSubmit } = setup();

    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText("Price paid (each)"), "two pounds");
    await user.clear(screen.getByLabelText("Currency"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a number")).toBeInTheDocument();
    expect(screen.getByText("Enter a price like 2.50")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("asks for a currency when a price is given", async () => {
    const { user, onSubmit } = setup();
    await user.type(screen.getByLabelText("Price paid (each)"), "1");
    await user.clear(screen.getByLabelText("Currency"));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Add the currency")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a save error", () => {
    renderWithProviders(
      <EntryForm
        defaultValues={emptyEntryForm}
        submitLabel="Save"
        onSubmit={vi.fn()}
        pending={false}
        error="Used in Goblins."
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Used in Goblins.");
  });
});
