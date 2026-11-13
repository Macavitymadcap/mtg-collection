"use client";

import { useEffect, useState, type JSX } from "react";
import Image from "next/image";
import { colors as wubrg, finishes, labels, rarities, type Finish, type Rarity } from "@mtg/shared";
import ClearRounded from "@mui/icons-material/ClearRounded";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { symbolUrl } from "@/components/cards/mana-symbols";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCollectionParams } from "../use-collection-params";

const colorNames: Record<string, string> = { W: "White", U: "Blue", B: "Black", R: "Red", G: "Green", C: "Colourless" };

/** Search and filter controls for the collection. Everything is stored in the URL. */
export function CollectionFilters(): JSX.Element {
  const { params, setFilters } = useCollectionParams();
  const [search, setSearch] = useState(params.search ?? "");
  const [type, setType] = useState(params.type ?? "");
  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedType = useDebouncedValue(type.trim());

  // Push typed text to the URL once typing pauses
  useEffect(() => {
    if (debouncedSearch !== (params.search ?? "")) setFilters({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debouncedSearch]);
  useEffect(() => {
    if (debouncedType !== (params.type ?? "")) setFilters({ type: debouncedType || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debouncedType]);

  const selectedColors = params.colors ? params.colors.split("") : [];
  const onColors = (_event: unknown, next: string[]): void => {
    // Colourless can't be combined with colours: whichever was picked last wins
    const added = next.find((c) => !selectedColors.includes(c));
    const value = added === "C" ? ["C"] : next.filter((c) => c !== "C");
    const ordered = wubrg.filter((c) => value.includes(c)).join("") || (value.includes("C") ? "C" : "");
    setFilters({ colors: ordered || null });
  };

  const hasFilters = Boolean(
    params.search ||
    params.colors ||
    params.type ||
    params.setCode ||
    params.rarity ||
    params.finish ||
    params.availableOnly,
  );
  const clear = (): void => {
    setSearch("");
    setType("");
    setFilters({
      search: null,
      colors: null,
      type: null,
      setCode: null,
      rarity: null,
      finish: null,
      availableOnly: null,
    });
  };

  return (
    <Stack sx={{ gap: 3, mb: 4 }}>
      <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 3 }}>
        <TextField
          label="Search by name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          sx={{ flex: 2, minWidth: 200 }}
        />
        <TextField
          label="Type"
          placeholder="e.g. Creature"
          value={type}
          onChange={(event) => setType(event.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 140 }}
        />
        <TextField
          label="Set code"
          value={params.setCode ?? ""}
          onChange={(event) => setFilters({ setCode: event.target.value.trim() || null })}
          size="small"
          sx={{ width: { md: 110 } }}
          slotProps={{ htmlInput: { style: { textTransform: "uppercase" } } }}
        />
        <TextField
          select
          label="Rarity"
          value={params.rarity ?? ""}
          onChange={(event) => setFilters({ rarity: (event.target.value || null) as Rarity | null })}
          size="small"
          sx={{ width: { md: 140 } }}
        >
          <MenuItem value="">Any</MenuItem>
          {rarities.map((rarity) => (
            <MenuItem key={rarity} value={rarity} sx={{ textTransform: "capitalize" }}>
              {rarity}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Finish"
          value={params.finish ?? ""}
          onChange={(event) => setFilters({ finish: (event.target.value || null) as Finish | null })}
          size="small"
          sx={{ width: { md: 130 } }}
        >
          <MenuItem value="">Any</MenuItem>
          {finishes.map((finish) => (
            <MenuItem key={finish} value={finish}>
              {labels.finish[finish]}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" sx={{ gap: 3, alignItems: "center", flexWrap: "wrap" }}>
        <ToggleButtonGroup value={selectedColors} onChange={onColors} size="small" aria-label="Colours">
          {[...wubrg, "C"].map((color) => (
            <ToggleButton key={color} value={color} aria-label={colorNames[color]} title={colorNames[color]}>
              <Image src={symbolUrl(color)} alt="" width={20} height={20} />
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <FormControlLabel
          control={
            <Switch
              checked={params.availableOnly}
              onChange={(event) => setFilters({ availableOnly: event.target.checked || null })}
            />
          }
          label="Free copies only"
        />
        {hasFilters && (
          <Button startIcon={<ClearRounded />} onClick={clear}>
            Clear filters
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
