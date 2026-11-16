"use client";

import type { JSX } from "react";
import DarkModeRounded from "@mui/icons-material/DarkModeRounded";
import LightModeRounded from "@mui/icons-material/LightModeRounded";
import SettingsBrightnessRounded from "@mui/icons-material/SettingsBrightnessRounded";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";

const next = { system: "light", light: "dark", dark: "system" } as const;
const labels = { system: "Theme: follows your device", light: "Theme: light", dark: "Theme: dark" } as const;
const icons = { system: SettingsBrightnessRounded, light: LightModeRounded, dark: DarkModeRounded };

/** Cycles the colour scheme: device setting → light → dark. MUI remembers the choice. */
export function ColorModeToggle(): JSX.Element | null {
  const { mode, setMode } = useColorScheme();
  // Unknown until mounted in the browser; render nothing rather than guess
  if (!mode) return null;

  const Icon = icons[mode];
  return (
    <Tooltip title={`${labels[mode]} (click to change)`}>
      <IconButton color="inherit" aria-label={labels[mode]} onClick={() => setMode(next[mode])}>
        <Icon />
      </IconButton>
    </Tooltip>
  );
}
