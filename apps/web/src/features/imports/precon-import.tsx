"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import type { ImportRowError, ImportSummary, PreconSummary } from "@mtg/shared";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { errorMessage } from "@/lib/errors";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ImportErrors } from "./import-errors";
import { usePreconImport, usePreconPreview, usePrecons } from "./queries";

const year = (date: string): string => date.slice(0, 4);

function Summary({ summary, owned }: { summary: ImportSummary; owned: boolean }): JSX.Element {
  if (owned) {
    return (
      <Typography>
        {summary.copies} cards from {summary.merged} of your collection entries · no copies added
      </Typography>
    );
  }
  return (
    <Typography>
      {summary.copies} cards · {summary.created} new {summary.created === 1 ? "entry" : "entries"}
      {summary.merged > 0 && ` · ${summary.merged} added to entries you already have`}
    </Typography>
  );
}

/** Substitutions made when building from owned cards (other printings, finishes …). */
function Notes({ notes }: { notes: ImportRowError[] }): JSX.Element {
  return (
    <Alert severity="info" variant="outlined">
      <AlertTitle>
        {notes.length} {notes.length === 1 ? "card uses" : "cards use"} a different copy than the product&apos;s
      </AlertTitle>
      <Stack component="ul" sx={{ m: 0, pl: 4, maxHeight: 240, overflowY: "auto" }}>
        {notes.map((note) => (
          <li key={`${note.line}-${note.message}`}>
            {note.name}: {note.message.replace(/^Uses/, "uses")}
          </li>
        ))}
      </Stack>
    </Alert>
  );
}

type Mode = "add" | "owned";

/** Pick a preconstructed product and add all of its cards, optionally as a deck too. */
export function PreconImport(): JSX.Element {
  const [input, setInput] = useState("");
  const search = useDebouncedValue(input.trim(), 300);
  const precons = usePrecons(search);
  const [precon, setPrecon] = useState<PreconSummary | null>(null);
  const [mode, setMode] = useState<Mode>("add");
  const [addAsDeck, setAddAsDeck] = useState(true);
  // Building from owned cards always makes a deck: that's its whole purpose
  const createDeck = mode === "owned" || addAsDeck;
  const [deckName, setDeckName] = useState("");
  const debouncedName = useDebouncedValue(deckName.trim(), 400);
  const run = usePreconImport();
  const [result, setResult] = useState<ImportSummary | null>(null);

  const request = precon
    ? {
        fileName: precon.fileName,
        createDeck,
        useOwnedCards: mode === "owned",
        ...(createDeck && debouncedName && { deckName: debouncedName }),
      }
    : null;
  const preview = usePreconPreview(result ? null : request);

  const choose = (next: PreconSummary | null): void => {
    setPrecon(next);
    setDeckName(next?.name ?? "");
    setResult(null);
    run.reset();
  };

  const importNow = (): void => {
    if (!request) return;
    run.mutate(request, { onSuccess: (summary) => !summary.dryRun && setResult(summary) });
  };

  // The import's own errors (e.g. a deck name taken since the preview) take precedence
  const errors = run.data?.errors.length ? run.data.errors : (preview.data?.errors ?? []);
  const notes = preview.data?.notes ?? [];
  const owned = mode === "owned";

  return (
    <Stack sx={{ gap: 4, maxWidth: 900 }}>
      <Typography color="text.secondary">
        Find the product (a Commander precon, starter deck, Jumpstart pack …). Either add all its cards to your
        collection as near-mint English copies (foils kept), or, if you&apos;ve already added them, build its deck from
        the copies you own. Card lists come from MTGJSON.
      </Typography>

      <Autocomplete<PreconSummary>
        options={precons.data ?? []}
        value={precon}
        onChange={(_event, next) => choose(next)}
        inputValue={input}
        onInputChange={(_event, text) => setInput(text)}
        filterOptions={(options) => options}
        loading={precons.isFetching}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(a, b) => a.fileName === b.fileName}
        noOptionsText={precons.isError ? errorMessage(precons.error, "Could not load products") : "No products match"}
        // MUI's default key is the label, and product names repeat (e.g. Jumpstart packs)
        renderOption={({ key: _key, ...props }, option) => (
          <Box component="li" key={option.fileName} {...props}>
            <Box>
              <Typography>{option.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {option.setCode.toUpperCase()} · {option.type}
                {option.releaseDate && ` · ${year(option.releaseDate)}`}
              </Typography>
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField {...params} label="Product" placeholder="e.g. Scrappy Survivors, or PIP commander" />
        )}
      />

      {precon && !result && (
        <RadioGroup value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
          <FormControlLabel value="add" control={<Radio />} label="Add these cards to my collection" />
          <FormControlLabel
            value="owned"
            control={<Radio />}
            label="I already own these cards: just build the deck from my collection"
          />
        </RadioGroup>
      )}

      {precon && !result && (
        <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 3, alignItems: { sm: "center" } }}>
          {!owned && (
            <FormControlLabel
              control={<Checkbox checked={addAsDeck} onChange={(event) => setAddAsDeck(event.target.checked)} />}
              label="Also create a deck from it"
            />
          )}
          {createDeck && (
            <TextField
              label="Deck name"
              value={deckName}
              onChange={(event) => setDeckName(event.target.value)}
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { maxLength: 100 } }}
            />
          )}
        </Stack>
      )}

      {preview.isFetching && !preview.data && (
        <Typography color="text.secondary">Checking cards with Scryfall…</Typography>
      )}
      {preview.isError && (
        <Alert severity="error">{errorMessage(preview.error, "Could not check this product.")}</Alert>
      )}
      {run.isError && <Alert severity="error">{errorMessage(run.error, "The import failed.")}</Alert>}

      {result && (
        <Alert
          severity="success"
          action={
            <Stack direction="row" sx={{ gap: 1 }}>
              {result.deck?.id && (
                <Button component={Link} href={`/decks/${result.deck.id}`} color="inherit">
                  Open deck
                </Button>
              )}
              <Button component={Link} href="/collection?sort=-createdAt" color="inherit">
                View collection
              </Button>
            </Stack>
          }
        >
          <AlertTitle>{owned ? `Built ${precon?.name ?? "the deck"}` : `Imported ${precon?.name ?? ""}`}</AlertTitle>
          <Summary summary={result} owned={owned} />
          {result.deck && <Typography variant="body2">Created the deck “{result.deck.name}”.</Typography>}
        </Alert>
      )}

      {precon && !result && preview.data && errors.length === 0 && (
        <Alert
          severity="info"
          action={
            <Button variant="contained" onClick={importNow} loading={run.isPending} disabled={preview.isFetching}>
              {owned ? "Create deck" : `Import ${preview.data.copies} cards`}
            </Button>
          }
        >
          <AlertTitle>{owned ? "Ready to build" : "Ready to import"}</AlertTitle>
          <Summary summary={preview.data} owned={owned} />
          {preview.data.deck && (
            <Typography variant="body2">
              Creates the {preview.data.deck.format} deck “{preview.data.deck.name}”.
            </Typography>
          )}
          {!owned && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Importing the same product again adds another set of copies.
            </Typography>
          )}
        </Alert>
      )}

      {precon && !result && preview.data && errors.length === 0 && notes.length > 0 && <Notes notes={notes} />}

      {precon && !result && errors.length > 0 && (
        <ImportErrors
          errors={errors}
          lineLabel="#"
          advice={
            owned
              ? 'Add the missing copies to your collection (or choose "Add these cards"), and rename the deck if its name is taken.'
              : "Rename the deck if its name is taken. Cards without a Scryfall ID can be added by hand afterwards."
          }
        />
      )}
    </Stack>
  );
}
