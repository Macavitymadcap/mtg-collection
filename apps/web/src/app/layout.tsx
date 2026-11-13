import type { Metadata } from "next";
import type { JSX, ReactNode } from "react";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { AppShell } from "@/components/layout/app-shell";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = { title: "MTG Collection" };

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <AppShell>{children}</AppShell>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
