"use client";

import { useState, type JSX } from "react";
import { boards, labels, type Board, type CollectionEntry } from "@mtg/shared";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useCollection } from "@/features/collection/queries";
import { printingLabel } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";

interface AddFromCollectionProps {
  defaultBoard: Board;
  disabled: boolean;
  onAdd: (entry: CollectionEntry, board: Board) => void;
}

/** Search your collection and add a copy to a board. Shows how many copies are free. */
export function AddFromCollection({ defaultBoard, disabled, onAdd }: AddFromCollectionProps): JSX.Element {
  const [board, setBoard] = useState<Board>(defaultBoard);
  const [input, setInput] = useState("");
  const search = useDebouncedValue(input.trim(), 250);
  const { data, isFetching } = useCollection({ page: 1, limit: 25, sort: "name", search: search || undefined });

  return (
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
      <TextField
        select
        label="Board"
        value={board}
        onChange={(event) => setBoard(event.target.value as Board)}
        sx={{ width: { sm: 160 } }}
      >
        {boards.map((b) => (
          <MenuItem key={b} value={b}>{labels.board[b]}</MenuItem>
        ))}
      </TextField>
      <Autocomplete<CollectionEntry>
        sx={{ flex: 1 }}
        options={data?.results ?? []}
        value={null}
        inputValue={input}
        onInputChange={(_event, text, reason) => reason !== "reset" && setInput(text)}
        onChange={(_event, entry) => {
          if (!entry) return;
          onAdd(entry, board);
          setInput("");
        }}
        disabled={disabled}
        loading={isFetching}
        filterOptions={(options) => options}
        getOptionLabel={(entry) => entry.card.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        noOptionsText={search ? "No owned cards match" : "Your collection is empty"}
        renderOption={({ key, ...props }, entry) => (
          <Box component="li" key={key} {...props}>
            <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between", gap: 2 }}>
              <span>
                {entry.card.name}
                <Typography component="span" variant="body2" color="text.secondary">
                  {" "}· {printingLabel(entry.card)} · {entry.condition}
                  {entry.finish !== "nonfoil" && ` · ${entry.finish}`}
                </Typography>
              </span>
              <Typography variant="body2" color={entry.available > 0 ? "success.main" : "warning.main"} sx={{ whiteSpace: "nowrap" }}>
                {entry.available} of {entry.quantity} free
              </Typography>
            </Stack>
          </Box>
        )}
        renderInput={(params) => <TextField {...params} label="Add from your collection" placeholder="Search by name" />}
      />
    </Stack>
  );
}
