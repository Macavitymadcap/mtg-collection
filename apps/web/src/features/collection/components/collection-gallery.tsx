"use client";

import type { JSX } from "react";
import Link from "next/link";
import type { CollectionEntry, Page } from "@mtg/shared";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CardImage } from "@/components/cards/card-image";
import { printingLabel } from "@/lib/format";
import { useCollectionParams } from "../use-collection-params";

interface CollectionGalleryProps {
  data: Page<CollectionEntry>;
}

/** The collection as a grid of card images. */
export function CollectionGallery({ data }: CollectionGalleryProps): JSX.Element {
  const { params, setParams } = useCollectionParams();

  return (
    <Stack sx={{ gap: 6 }}>
      <Grid container spacing={4}>
        {data.results.map((entry) => (
          <Grid key={entry.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
            <Box component={Link} href={`/collection/${entry.id}`} sx={{ display: "block", color: "inherit", textDecoration: "none" }}>
              <Badge badgeContent={`×${entry.quantity}`} color="primary" sx={{ display: "block", "& .MuiBadge-badge": { right: 12, top: 12 } }}>
                <CardImage card={entry.card} />
              </Badge>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }} noWrap>
                {printingLabel(entry.card)} · {entry.condition}
                {entry.finish !== "nonfoil" && ` · ${entry.finish}`}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
      {data.totalPages > 1 && (
        <Pagination
          count={data.totalPages}
          page={params.page}
          onChange={(_event, page) => void setParams({ page })}
          sx={{ alignSelf: "center" }}
        />
      )}
    </Stack>
  );
}
