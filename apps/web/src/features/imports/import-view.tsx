"use client";

import type { JSX } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { PageHeader } from "@/components/layout/page-header";
import { ManaboxImport } from "./manabox-import";
import { PreconImport } from "./precon-import";

const sources = ["manabox", "precon"] as const;

/** Import page: a ManaBox CSV or a preconstructed product. The chosen tab is kept in the URL. */
export function ImportView(): JSX.Element {
  const [source, setSource] = useQueryState("source", parseAsStringLiteral(sources).withDefault("manabox"));

  return (
    <>
      <PageHeader title="Import cards" subtitle="Add many cards at once" />
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs value={source} onChange={(_event, value: (typeof sources)[number]) => void setSource(value)}>
          <Tab value="manabox" label="ManaBox export" />
          <Tab value="precon" label="Preconstructed deck" />
        </Tabs>
      </Box>
      {source === "manabox" ? <ManaboxImport /> : <PreconImport />}
    </>
  );
}
