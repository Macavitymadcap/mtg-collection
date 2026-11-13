"use client";

import type { JSX } from "react";
import Link from "next/link";
import AddRounded from "@mui/icons-material/AddRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import TableRowsRounded from "@mui/icons-material/TableRowsRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/layout/page-header";
import { errorMessage } from "@/lib/errors";
import { useCollection } from "../queries";
import { toCollectionQuery, useCollectionParams } from "../use-collection-params";
import { CollectionFilters } from "./collection-filters";
import { CollectionGallery } from "./collection-gallery";
import { CollectionTable } from "./collection-table";

/** The collection page: filters plus a table or image grid. */
export function CollectionView(): JSX.Element {
  const { params, setParams } = useCollectionParams();
  const { data, isPending, isFetching, isError, error, refetch } = useCollection(toCollectionQuery(params));

  const subtitle = data ? `${data.count} ${data.count === 1 ? "entry" : "entries"}` : "Every card you own";

  return (
    <>
      <PageHeader
        title="Collection"
        subtitle={subtitle}
        actions={
          <>
            <Button component={Link} href="/collection/import" startIcon={<UploadFileRounded />}>
              Import
            </Button>
            <Button component={Link} href="/collection/add" variant="contained" startIcon={<AddRounded />}>
              Add cards
            </Button>
          </>
        }
      />

      <CollectionFilters />

      <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 2 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={params.view}
          onChange={(_event, view: typeof params.view | null) => view && void setParams({ view })}
          aria-label="View"
        >
          <ToggleButton value="table" aria-label="Table"><TableRowsRounded fontSize="small" /></ToggleButton>
          <ToggleButton value="grid" aria-label="Images"><GridViewRounded fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {isError ? (
        <Alert severity="error" action={<Button onClick={() => void refetch()}>Retry</Button>}>
          {errorMessage(error, "Could not load the collection.")}
        </Alert>
      ) : params.view === "table" ? (
        <CollectionTable data={data} loading={isFetching} />
      ) : isPending ? (
        <Skeleton variant="rounded" height={400} />
      ) : data.results.length === 0 ? (
        <Typography color="text.secondary">No cards match.</Typography>
      ) : (
        <CollectionGallery data={data} />
      )}
    </>
  );
}
