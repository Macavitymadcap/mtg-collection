"use client";

import { useEffect, useState, type JSX, type ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SnackbarProvider } from "@/components/feedback/snackbar-provider";
import { theme } from "@/theme/theme";
import { makeQueryClient } from "@/lib/query-client";

/** Client-side providers for the whole app. */
export function Providers({ children }: { children: ReactNode }): JSX.Element {
  // One client per browser session; useState keeps it across re-renders.
  const [queryClient] = useState(makeQueryClient);

  // Marks the page as interactive. Browser tests wait for this before typing,
  // since input before hydration is lost when React takes over the fields.
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <NuqsAdapter>
          <SnackbarProvider>{children}</SnackbarProvider>
        </NuqsAdapter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
