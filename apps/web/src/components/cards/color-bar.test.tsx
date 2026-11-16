import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorBar, IdentityStripe } from "./color-bar";

describe("ColorBar", () => {
  it("describes the colours in WUBRG order, then colourless", () => {
    render(<ColorBar counts={{ G: 3, C: 10, W: 1 }} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("White 1, Green 3, Colourless 10");
  });

  it("renders nothing without cards", () => {
    const { container } = render(<ColorBar counts={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("IdentityStripe", () => {
  it("draws one band per colour, or one for colourless", () => {
    const { container, rerender } = render(<IdentityStripe colors="RGW" />);
    expect(container.firstElementChild?.children).toHaveLength(3);
    rerender(<IdentityStripe colors="" />);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});
