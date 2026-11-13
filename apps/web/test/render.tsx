import type { ReactElement, ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import { SnackbarProvider } from "@/components/feedback/snackbar-provider";
import { theme } from "@/theme/theme";

interface Options {
  /** Initial query string, e.g. "?view=grid". */
  searchParams?: string;
  /** Called when the component changes the URL's query string. */
  onUrlUpdate?: OnUrlUpdateFunction;
}

/** Renders with the app's providers: theme, a fresh query client, URL state and the snackbar. */
export function renderWithProviders(ui: ReactElement, { searchParams, onUrlUpdate }: Options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
          <SnackbarProvider>{children}</SnackbarProvider>
        </NuqsTestingAdapter>
      </QueryClientProvider>
    </ThemeProvider>
  );
  return { user: userEvent.setup(), queryClient, ...render(ui, { wrapper: Wrapper }) };
}
