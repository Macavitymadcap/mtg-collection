import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CardImage } from "./card-image";
import { ColorPips } from "./color-pips";
import { ManaSymbols, symbolUrl } from "./mana-symbols";

describe("ManaSymbols", () => {
  it("shows each symbol as Scryfall's image", () => {
    render(<ManaSymbols cost="{2}{W/U}{W/U}" />);
    const images = screen.getAllByRole("img");
    expect(images.map((img) => img.getAttribute("alt"))).toEqual(["{2}", "{W/U}", "{W/U}"]);
    expect(images[1]).toHaveAttribute("src", "https://svgs.scryfall.io/card-symbols/WU.svg");
  });

  it("separates the faces of double-faced cards", () => {
    render(<ManaSymbols cost="{1}{U} // {3}{U}{U}" />);
    expect(screen.getByText("//")).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(5);
  });

  it("renders nothing without a cost", () => {
    const { container } = render(<ManaSymbols cost={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("builds symbol URLs", () => {
    expect(symbolUrl("2/W")).toBe("https://svgs.scryfall.io/card-symbols/2W.svg");
  });
});

describe("ColorPips", () => {
  it("shows one pip per colour, or colourless", () => {
    const { rerender } = render(<ColorPips colors="BG" />);
    expect(screen.getAllByRole("img").map((img) => img.getAttribute("alt"))).toEqual(["B", "G"]);
    rerender(<ColorPips colors="" />);
    expect(screen.getByRole("img")).toHaveAttribute("alt", "C");
  });
});

describe("CardImage", () => {
  const card = {
    name: "Shock",
    imageSmall: "https://cards.scryfall.io/small/x.jpg",
    imageNormal: "https://cards.scryfall.io/normal/x.jpg",
  };

  it("uses the size asked for, falling back to the other", () => {
    const { rerender } = render(<CardImage card={card} />);
    expect(screen.getByRole("img", { name: "Shock" })).toHaveAttribute("src", card.imageSmall);
    rerender(<CardImage card={card} size="normal" />);
    expect(screen.getByRole("img", { name: "Shock" })).toHaveAttribute("src", card.imageNormal);
    rerender(<CardImage card={{ ...card, imageNormal: null }} size="normal" />);
    expect(screen.getByRole("img", { name: "Shock" })).toHaveAttribute("src", card.imageSmall);
  });

  it("shows the name when there's no image", () => {
    render(<CardImage card={{ name: "Mystery", imageSmall: null, imageNormal: null }} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Mystery")).toBeInTheDocument();
  });
});
