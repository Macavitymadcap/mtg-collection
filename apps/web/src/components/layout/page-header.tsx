import type { JSX, ReactNode } from "react";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Buttons shown on the right. */
  actions?: ReactNode;
}

/** Page title row used at the top of every page. */
export function PageHeader({ title, subtitle, actions }: PageHeaderProps): JSX.Element {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 4, mb: 6 }}
    >
      <Stack sx={{ gap: 1 }}>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Stack>
      {actions && (
        <Stack direction="row" sx={{ gap: 2 }}>
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
