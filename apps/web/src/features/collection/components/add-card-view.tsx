"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import type { Card, CollectionEntry } from "@mtg/shared";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CardImage } from "@/components/cards/card-image";
import { ManaSymbols } from "@/components/cards/mana-symbols";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { PageHeader } from "@/components/layout/page-header";
import { CardNameSearch } from "@/features/catalog/card-name-search";
import { PrintingPicker } from "@/features/catalog/printing-picker";
import { errorMessage } from "@/lib/errors";
import { printingLabel } from "@/lib/format";
import { useAddToCollection } from "../queries";
import { EntryForm, emptyEntryForm, type EntryFields } from "./entry-form";

/** Search for a card, pick the printing, say how many and in what condition. */
export function AddCardView(): JSX.Element {
  const showMessage = useSnackbar();
  const add = useAddToCollection();
  const [name, setName] = useState<string | null>(null);
  const [printing, setPrinting] = useState<Card | null>(null);
  const [added, setAdded] = useState<CollectionEntry[]>([]);
  // Changing the key gives the next card a fresh form and search box
  const [round, setRound] = useState(0);

  const chooseName = (next: string | null): void => {
    setName(next);
    setPrinting(null);
  };

  const save = (fields: EntryFields): void => {
    if (!printing) return;
    add.mutate(
      { scryfallId: printing.id, ...fields },
      {
        onSuccess: ({ entry, created }) => {
          showMessage(
            created
              ? `Added ${fields.quantity} × ${entry.card.name}`
              : `Added ${fields.quantity} to your existing ${entry.card.name}: now ${entry.quantity}`,
          );
          setAdded((list) => [entry, ...list.filter((e) => e.id !== entry.id)]);
          setName(null);
          setPrinting(null);
          setRound((r) => r + 1);
        },
      },
    );
  };

  return (
    <>
      <PageHeader title="Add cards" subtitle="Search Scryfall, pick the printing, then save" />

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, lg: added.length ? 9 : 12 }}>
          <Stack sx={{ gap: 6 }}>
            <Box sx={{ maxWidth: 480 }}>
              <CardNameSearch key={round} value={name} onChange={chooseName} autoFocus />
            </Box>

            {name && (
              <Stack sx={{ gap: 3 }}>
                <Typography variant="h6" component="h2">
                  Which printing?
                </Typography>
                <PrintingPicker name={name} selectedId={printing?.id ?? null} onSelect={setPrinting} />
              </Stack>
            )}

            {printing && (
              <Paper sx={{ p: 4 }}>
                <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 4 }}>
                  <Box sx={{ width: 146, flexShrink: 0 }}>
                    <CardImage card={printing} />
                  </Box>
                  <Stack sx={{ gap: 3, flex: 1 }}>
                    <Box>
                      <Typography variant="h6" component="h2">
                        {printing.name}
                      </Typography>
                      <Typography color="text.secondary">
                        {printing.setName} · {printingLabel(printing)}
                        {printing.manaCost && (
                          <>
                            {" "}
                            · <ManaSymbols cost={printing.manaCost} />
                          </>
                        )}
                      </Typography>
                    </Box>
                    <EntryForm
                      key={printing.id}
                      defaultValues={emptyEntryForm}
                      submitLabel="Add to collection"
                      onSubmit={save}
                      pending={add.isPending}
                      error={add.isError ? errorMessage(add.error) : null}
                    />
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>

        {added.length > 0 && (
          <Grid size={{ xs: 12, lg: 3 }}>
            <Paper>
              <Typography variant="subtitle2" sx={{ px: 4, pt: 3 }}>
                Added this session
              </Typography>
              <List dense>
                {added.map((entry) => (
                  <ListItemButton key={entry.id} component={Link} href={`/collection/${entry.id}`}>
                    <ListItemText
                      primary={`${entry.quantity} × ${entry.card.name}`}
                      secondary={`${printingLabel(entry.card)} · ${entry.condition}`}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </>
  );
}
