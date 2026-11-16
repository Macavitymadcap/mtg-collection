import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

/**
 * True below the `md` breakpoint (900px): phones and small tablets, where
 * pages switch to their stacked, touch-first layouts. False during server
 * rendering, so a phone briefly sees the desktop layout before hydration.
 */
export function useIsMobile(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down("md"));
}
