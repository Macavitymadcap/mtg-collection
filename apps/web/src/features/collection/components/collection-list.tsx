"use client";

import type { JSX } from "react";
import Link from "next/link";
import type { CollectionEntry, Page } from "@mtg/shared";
import Box from "@mui/material/Box";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Pagination from "@mui/material/Pagination";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CardImage } from "@/components/cards/card-image";
import { CardPreview } from "@/components/cards/card-preview";
import { ManaSymbols } from "@/components/cards/mana-symbols";
import { printingLabel } from "@/lib/format";
import { useCollectionParams } from "../use-collection-params";

/** The collection as a compact list, for phones: thumbnail, name, printing and counts. */
export function CollectionList({ data }: { data: Page<CollectionEntry> }): JSX.Element {
  const { params, setParams } = useCollectionParams();

  return (
    <Stack sx={{ gap: 4 }}>
      <Paper>
        <List disablePadding>
          {data.results.map((entry, i) => (
            <ListItem key={entry.id} disablePadding>
              <ListItemButton
                component={Link}
                href={`/collection/${entry.id}`}
                divider={i < data.results.length - 1}
                sx={{ gap: 3, py: 2 }}
              >
                {/* Long-press the thumbnail for a full-size look */}
                <CardPreview card={entry.card}>
                  <Box sx={{ width: 44, flexShrink: 0 }}>
                    <CardImage card={entry.card} />
                  </Box>
                </CardPreview>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontWeight: 500 }}>
                    {entry.card.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {printingLabel(entry.card)} · {entry.condition}
                    {entry.finish !== "nonfoil" && ` · ${entry.finish}`}
                  </Typography>
                  <ManaSymbols cost={entry.card.manaCost} size={14} />
                </Box>
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>×{entry.quantity}</Typography>
                  <Typography variant="caption" color={entry.available < 0 ? "warning.main" : "text.secondary"}>
                    {entry.available < 0 ? `${-entry.available} short` : `${entry.available} free`}
                  </Typography>
                </Box>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
      {data.totalPages > 1 && (
        <Pagination
          count={data.totalPages}
          page={params.page}
          onChange={(_event, page) => void setParams({ page })}
          sx={{ alignSelf: "center" }}
          siblingCount={0}
        />
      )}
    </Stack>
  );
}
