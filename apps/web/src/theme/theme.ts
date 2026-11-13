"use client";

import { createTheme } from "@mui/material/styles";

/** App-wide MUI theme. Spacing unit is 4px. */
export const theme = createTheme({
  cssVariables: true,
  palette: {
    primary: { main: "#4A3B8F" },
    secondary: { main: "#B5862B" },
    background: { default: "#F4F3F7", paper: "#FFFFFF" },
  },
  spacing: 4,
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-inter), sans-serif",
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiPaper: { defaultProps: { variant: "outlined" } },
  },
});
