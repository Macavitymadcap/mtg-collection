"use client";

import type { JSX, ReactNode } from "react";
import Link from "next/link";
import ErrorOutlineRounded from "@mui/icons-material/ErrorOutlineRounded";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/layout/page-header";

interface ErrorPanelProps {
  title: string;
  message: ReactNode;
  /** Buttons that do something, shown first. */
  actions?: ReactNode;
  /** Places to go instead, as plain data so server components can pass them. */
  links?: { href: string; label: string }[];
}

/** A whole page's worth of "this went wrong": what happened, and where to go from here. */
export function ErrorPanel({ title, message, actions, links = [] }: ErrorPanelProps): JSX.Element {
  return (
    <>
      <PageHeader title={title} />
      <Paper sx={{ p: 6 }}>
        <Stack direction="row" sx={{ gap: 3, alignItems: "flex-start" }}>
          <ErrorOutlineRounded color="error" sx={{ fontSize: 32 }} />
          <Stack sx={{ gap: 4 }}>
            <Typography>{message}</Typography>
            <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap" }}>
              {actions}
              {links.map(({ href, label }) => (
                <Button key={href} component={Link} href={href}>
                  {label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}
