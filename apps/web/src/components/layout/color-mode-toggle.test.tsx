import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { theme } from "@/theme/theme";
import { ColorModeToggle } from "./color-mode-toggle";

describe("ColorModeToggle", () => {
  beforeEach(() => localStorage.clear());

  it("follows the device by default, then cycles light → dark → device, remembering the choice", async () => {
    render(
      <ThemeProvider theme={theme}>
        <ColorModeToggle />
      </ThemeProvider>,
    );

    const button = await screen.findByRole("button", { name: "Theme: follows your device" });
    await userEvent.click(button);
    expect(screen.getByRole("button", { name: "Theme: light" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Theme: light" }));
    expect(screen.getByRole("button", { name: "Theme: dark" })).toBeInTheDocument();
    expect(localStorage.getItem("mui-mode")).toBe("dark");
    await userEvent.click(screen.getByRole("button", { name: "Theme: dark" }));
    expect(screen.getByRole("button", { name: "Theme: follows your device" })).toBeInTheDocument();
  });
});
