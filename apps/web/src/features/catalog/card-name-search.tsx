"use client";

import { useState, type JSX } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useCardNames } from "./queries";

interface CardNameSearchProps {
  value: string | null;
  onChange: (name: string | null) => void;
  autoFocus?: boolean;
}

/** Type-ahead search over every card name on Scryfall. */
export function CardNameSearch({ value, onChange, autoFocus }: CardNameSearchProps): JSX.Element {
  const [input, setInput] = useState("");
  const query = useDebouncedValue(input, 250);
  const { data: names = [], isFetching } = useCardNames(query);

  return (
    <Autocomplete
      value={value}
      onChange={(_event, name) => onChange(name)}
      inputValue={input}
      onInputChange={(_event, text) => setInput(text)}
      options={names}
      // Scryfall has already filtered by what was typed
      filterOptions={(options) => options}
      loading={isFetching}
      noOptionsText={input.trim().length < 2 ? "Type at least 2 letters" : "No cards found"}
      renderInput={(params) => <TextField {...params} label="Card name" autoFocus={autoFocus} />}
    />
  );
}
