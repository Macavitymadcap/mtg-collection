import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColourBar, IdentityStripe } from "./colour-bar";

describe("ColourBar", () => {
  it("describes the colours in WUBRG order, then colourless", () => {
    render(<ColourBar counts={{ G: 3, C: 10, W: 1 }} />);
    expect(screen.getByRole("img")).toHaveAccessibleName("White 1, Green 3, Colourless 10");
  });

  it("renders nothing without cards", () => {
    const { container } = render(<ColourBar counts={{}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("IdentityStripe", () => {
  it("draws one band per colour, or one for colourless", () => {
    const { container, rerender } = render(<IdentityStripe colours="RGW" />);
    expect(container.firstElementChild?.children).toHaveLength(3);
    rerender(<IdentityStripe colours="" />);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });
});
