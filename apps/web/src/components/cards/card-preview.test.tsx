import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CardPreview } from "./card-preview";

const card = {
  name: "Sol Ring",
  imageSmall: "https://cards.scryfall.io/small/s.jpg",
  imageNormal: "https://cards.scryfall.io/normal/s.jpg",
};

describe("CardPreview", () => {
  it("shows the full card image when hovering the name", async () => {
    render(
      <CardPreview card={card}>
        <span>Sol Ring</span>
      </CardPreview>,
    );

    await userEvent.hover(screen.getByText("Sol Ring"));
    expect(await screen.findByRole("img", { name: "Sol Ring" })).toHaveAttribute("src", card.imageNormal);
  });

  it("leaves cards without an image alone", async () => {
    render(
      <CardPreview card={{ ...card, imageSmall: null, imageNormal: null }}>
        <span>Sol Ring</span>
      </CardPreview>,
    );
    await userEvent.hover(screen.getByText("Sol Ring"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
