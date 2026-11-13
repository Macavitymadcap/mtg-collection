"use client";

import type { JSX } from "react";
import type { DeckStats as Stats } from "@mtg/shared";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { ColorPips } from "@/components/cards/color-pips";

/** Mana curve chart plus colour and type counts for the played boards. */
export function DeckStats({ stats }: { stats: Stats }): JSX.Element {
  const curve = Object.entries(stats.manaCurve);
  const types = Object.entries(stats.types).sort(([, a], [, b]) => b - a);
  const colors = Object.entries(stats.colors);

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h6" component="h2">Mana curve</Typography>
      <Typography variant="caption" color="text.secondary">Non-land cards by mana value</Typography>
      <BarChart
        height={200}
        xAxis={[{ scaleType: "band", data: curve.map(([label]) => label) }]}
        yAxis={[{ tickMinStep: 1, width: 30 }]}
        series={[{ data: curve.map(([, value]) => value), label: "Cards" }]}
        hideLegend
        margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
      />

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Colours</Typography>
      {colors.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No cards yet.</Typography>
      ) : (
        <Stack direction="row" sx={{ gap: 3, flexWrap: "wrap" }}>
          {colors.map(([color, value]) => (
            <Stack key={color} direction="row" sx={{ gap: 1, alignItems: "center" }}>
              <ColorPips colors={color === "C" ? "" : color} />
              <Typography variant="body2">{value}</Typography>
            </Stack>
          ))}
        </Stack>
      )}

      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Types</Typography>
      {types.map(([type, value]) => (
        <Stack key={type} direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body2">{type}</Typography>
          <Typography variant="body2" color="text.secondary">{value}</Typography>
        </Stack>
      ))}
    </Paper>
  );
}
