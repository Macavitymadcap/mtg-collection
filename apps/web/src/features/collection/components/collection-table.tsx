"use client";

import type { JSX } from "react";
import { useRouter } from "next/navigation";
import { labels, type CollectionEntry, type CollectionSort, type Page } from "@mtg/shared";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { DataGrid, type GridColDef, type GridRowParams, type GridSortModel } from "@mui/x-data-grid";
import { ManaSymbols } from "@/components/cards/mana-symbols";
import { formatPrice, printingLabel } from "@/lib/format";
import { useCollectionParams } from "../use-collection-params";

/** Grid columns that the API can sort by, and the sort value for each. */
const sortable: Record<string, { asc: CollectionSort; desc?: CollectionSort }> = {
  name: { asc: "name", desc: "-name" },
  printing: { asc: "setCode" },
  manaValue: { asc: "manaValue", desc: "-manaValue" },
  createdAt: { asc: "createdAt", desc: "-createdAt" },
};

function toSortModel(sort: CollectionSort): GridSortModel {
  for (const [field, { asc, desc }] of Object.entries(sortable)) {
    if (sort === asc) return [{ field, sort: "asc" }];
    if (sort === desc) return [{ field, sort: "desc" }];
  }
  return [];
}

const flagNames = ["signed", "altered", "misprint", "proxy"] as const;

const columns: GridColDef<CollectionEntry>[] = [
  { field: "name", headerName: "Name", flex: 2, minWidth: 180, valueGetter: (_value, row) => row.card.name },
  {
    field: "printing",
    headerName: "Printing",
    width: 120,
    valueGetter: (_value, row) => printingLabel(row.card),
  },
  {
    field: "manaValue",
    headerName: "Cost",
    width: 130,
    valueGetter: (_value, row) => row.card.manaValue,
    renderCell: ({ row }) => <ManaSymbols cost={row.card.manaCost} />,
  },
  { field: "type", headerName: "Type", flex: 2, minWidth: 160, sortable: false, valueGetter: (_value, row) => row.card.typeLine },
  {
    field: "finish",
    headerName: "Finish",
    width: 100,
    sortable: false,
    valueFormatter: (value: CollectionEntry["finish"]) => labels.finish[value],
  },
  { field: "condition", headerName: "Cond.", width: 80, sortable: false },
  {
    field: "flags",
    headerName: "",
    width: 140,
    sortable: false,
    renderCell: ({ row }) => (
      <Stack direction="row" sx={{ gap: 1, alignItems: "center", height: "100%" }}>
        {flagNames.filter((flag) => row[flag]).map((flag) => (
          <Chip key={flag} label={flag} size="small" variant="outlined" />
        ))}
      </Stack>
    ),
  },
  { field: "quantity", headerName: "Owned", type: "number", width: 80, sortable: false },
  { field: "available", headerName: "Free", type: "number", width: 70, sortable: false },
  {
    field: "purchasePrice",
    headerName: "Paid",
    type: "number",
    width: 90,
    sortable: false,
    valueFormatter: (_value, row) => formatPrice(row.purchasePrice, row.currency),
  },
  {
    field: "createdAt",
    headerName: "Added",
    width: 110,
    valueFormatter: (value: string) => new Date(value).toLocaleDateString("en-GB"),
  },
];

interface CollectionTableProps {
  data: Page<CollectionEntry> | undefined;
  loading: boolean;
}

/** The collection as a table. Paging and sorting happen on the server. */
export function CollectionTable({ data, loading }: CollectionTableProps): JSX.Element {
  const router = useRouter();
  const { params, setParams } = useCollectionParams();

  return (
    <DataGrid
      rows={data?.results ?? []}
      columns={columns}
      rowCount={data?.count ?? 0}
      loading={loading}
      paginationMode="server"
      sortingMode="server"
      paginationModel={{ page: params.page - 1, pageSize: params.limit }}
      onPaginationModelChange={(model) => void setParams({ page: model.page + 1, limit: model.pageSize })}
      pageSizeOptions={[25, 50, 100]}
      sortModel={toSortModel(params.sort)}
      onSortModelChange={([item]) => {
        const option = item && sortable[item.field];
        const sort = option ? (item.sort === "desc" ? (option.desc ?? option.asc) : option.asc) : "name";
        void setParams({ sort, page: 1 });
      }}
      onRowClick={({ row }: GridRowParams<CollectionEntry>) => router.push(`/collection/${row.id}`)}
      disableRowSelectionOnClick
      disableColumnFilter
      autoHeight
      sx={{ "& .MuiDataGrid-row": { cursor: "pointer" } }}
    />
  );
}
