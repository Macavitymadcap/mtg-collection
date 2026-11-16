"use client";

import { createTheme } from "@mui/material/styles";

/** Magic's five colours plus colourless, used for pips, filters, charts and chips. */
export type ManaColor = "W" | "U" | "B" | "R" | "G" | "C";

declare module "@mui/material/styles" {
  interface Palette {
    mana: Record<ManaColor, string>;
  }
  interface PaletteOptions {
    mana?: Record<ManaColor, string>;
  }
}

// Mana colours tuned per scheme so each keeps contrast against the background
const manaLight: Record<ManaColor, string> = {
  W: "#C9A227",
  U: "#1F6FB2",
  B: "#3B3540",
  R: "#C7372F",
  G: "#2E7D4F",
  C: "#8A8494",
};
const manaDark: Record<ManaColor, string> = {
  W: "#F2D06B",
  U: "#5EA8E8",
  B: "#B9AFC4",
  R: "#F0665E",
  G: "#5CC28A",
  C: "#A8A2B3",
};

const display = "var(--font-cinzel), Georgia, serif";

/**
 * App-wide MUI theme, with light and dark colour schemes. The scheme follows
 * the system setting unless the user picks one; InitColorSchemeScript in the
 * root layout applies it before the page paints. Spacing unit is 4px.
 */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#4A3B8F" },
        secondary: { main: "#B5862B" },
        background: { default: "#F4F3F7", paper: "#FFFFFF" },
        // Darker than MUI's default orange, so white text on it (e.g. chips) is readable
        warning: { main: "#B45309" },
        mana: manaLight,
      },
    },
    dark: {
      palette: {
        primary: { main: "#A99BEA" },
        secondary: { main: "#E0B04F" },
        background: { default: "#121019", paper: "#1C1926" },
        mana: manaDark,
      },
    },
  },
  spacing: 4,
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
    h1: { fontFamily: display, fontWeight: 600 },
    h2: { fontFamily: display, fontWeight: 600 },
    h3: { fontFamily: display, fontWeight: 600 },
    h4: { fontFamily: display, fontWeight: 600, letterSpacing: "0.02em" },
    h5: { fontFamily: display, fontWeight: 600 },
    h6: { fontFamily: display, fontWeight: 600, letterSpacing: "0.02em" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiPaper: { defaultProps: { variant: "outlined" } },
    // The app bar keeps the brand colour in both schemes
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: "#4A3B8F",
          color: "#FFFFFF",
          ...theme.applyStyles("dark", { backgroundColor: "#241E3D" }),
        }),
      },
    },
  },
});
