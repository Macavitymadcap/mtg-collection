"use client";

import type { JSX } from "react";
import Link from "next/link";
import AddRounded from "@mui/icons-material/AddRounded";
import GridViewRounded from "@mui/icons-material/GridViewRounded";
import TableRowsRounded from "@mui/icons-material/TableRowsRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/page-states";
import { PageHeader } from "@/components/layout/page-header";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useCollection } from "../queries";
import { toCollectionQuery, useCollectionParams } from "../use-collection-params";
import { CollectionFilters } from "./collection-filters";
import { CollectionGallery } from "./collection-gallery";
import { CollectionList } from "./collection-list";
import { CollectionTable } from "./collection-table";

/** The collection page: filters plus a table or image grid. */
export function CollectionView(): JSX.Element {
  const { params, setParams } = useCollectionParams();
  const { data, isPending, isFetching, isError, error, refetch } = useCollection(toCollectionQuery(params));
  // Phones get a list instead of the wide table; the image grid works on both
  const isMobile = useIsMobile();
  const showTable = params.view === "table" && !isMobile;

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
          <ToggleButton value="table" aria-label={isMobile ? "List" : "Table"}>
            <TableRowsRounded fontSize="small" />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="Images">
            <GridViewRounded fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {isError ? (
        <ErrorState error={error} fallback="Could not load the collection." onRetry={() => void refetch()} />
      ) : showTable ? (
        <CollectionTable data={data} loading={isFetching} />
      ) : isPending ? (
        <LoadingState shape="cards" count={12} />
      ) : data.results.length === 0 ? (
        <EmptyState title="No cards match." message="Try fewer filters, or add some cards." />
      ) : params.view === "table" ? (
        <CollectionList data={data} />
      ) : (
        <CollectionGallery data={data} />
      )}
    </>
  );
}
