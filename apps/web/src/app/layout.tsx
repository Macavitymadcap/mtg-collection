import type { Metadata, Viewport } from "next";
import type { JSX, ReactNode } from "react";
import { Cinzel, Inter } from "next/font/google";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
// Headings only (see theme.ts)
const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-cinzel" });

export const metadata: Metadata = {
  title: "MTG Collection",
  applicationName: "MTG Collection",
  // Opened from the home screen on iOS: run full screen, titled briefly
  appleWebApp: { capable: true, title: "MTG", statusBarStyle: "black-translucent" },
};

// The browser's toolbar colour on phones, matching the app bar in each scheme
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4A3B8F" },
    { media: "(prefers-color-scheme: dark)", color: "#241E3D" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    // The colour scheme script adds a class to <html> before React hydrates
    <html lang="en-GB" className={`${inter.variable} ${cinzel.variable}`} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="class" />
        <AppRouterCacheProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
