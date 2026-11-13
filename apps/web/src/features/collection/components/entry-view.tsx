"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Card, UpdateCollectionEntryRequest } from "@mtg/shared";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import SwapHorizRounded from "@mui/icons-material/SwapHorizRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { CardImage } from "@/components/cards/card-image";
import { ManaSymbols } from "@/components/cards/mana-symbols";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { PageHeader } from "@/components/layout/page-header";
import { PrintingPicker } from "@/features/catalog/printing-picker";
import { errorMessage } from "@/lib/errors";
import { formatDate, printingLabel } from "@/lib/format";
import { useCollectionEntry, useDeleteEntry, useUpdateEntry } from "../queries";
import { EntryForm, entryToForm } from "./entry-form";

/** One collection entry: the card, an edit form, where it's used, and delete. */
export function EntryView({ id }: { id: number }): JSX.Element {
  const router = useRouter();
  const showMessage = useSnackbar();
  const { data: entry, isPending, isError, error } = useCollectionEntry(id);
  const update = useUpdateEntry(id);
  const remove = useDeleteEntry();
  const [choosingPrinting, setChoosingPrinting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const back = (
    <Button component={Link} href="/collection" startIcon={<ArrowBackRounded />}>
      Collection
    </Button>
  );

  if (isPending) {
    return (
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 4 }}><Skeleton variant="rounded" sx={{ aspectRatio: "5 / 7", height: "auto" }} /></Grid>
        <Grid size={{ xs: 12, md: 8 }}><Skeleton variant="rounded" height={400} /></Grid>
      </Grid>
    );
  }

  if (isError) {
    return (
      <>
        <PageHeader title="Card not found" actions={back} />
        <Alert severity="error">{errorMessage(error, "Could not load this entry.")}</Alert>
      </>
    );
  }

  /** After a save the entry may have been merged into another one, with a different id. */
  const save = (changes: UpdateCollectionEntryRequest, done?: () => void): void => {
    update.mutate(changes, {
      onSuccess: (saved) => {
        done?.();
        if (saved.id !== id) {
          showMessage(`Merged with an identical entry: you now have ${saved.quantity}`, "info");
          router.replace(`/collection/${saved.id}`);
        } else {
          showMessage("Saved");
        }
      },
    });
  };

  const changePrinting = (card: Card): void => {
    if (card.id === entry.card.id) {
      setChoosingPrinting(false);
      return;
    }
    save({ scryfallId: card.id }, () => setChoosingPrinting(false));
  };

  const confirmDelete = (): void => {
    remove.mutate(id, {
      onSuccess: () => {
        showMessage(`Deleted ${entry.card.name}`);
        router.push("/collection");
      },
    });
  };

  const { card } = entry;

  return (
    <>
      <PageHeader title={card.name} subtitle={`${card.setName} · ${printingLabel(card)}`} actions={back} />

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, sm: 5, md: 4 }}>
          <Stack sx={{ gap: 3 }}>
            <CardImage card={card} size="normal" priority />
            <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap" }}>
              <Button startIcon={<SwapHorizRounded />} onClick={() => setChoosingPrinting(true)}>
                Change printing
              </Button>
              <Button href={card.scryfallUri} target="_blank" rel="noreferrer" endIcon={<OpenInNewRounded />}>
                Scryfall
              </Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, sm: 7, md: 8 }}>
          <Stack sx={{ gap: 6 }}>
            <Paper sx={{ p: 4 }}>
              <Stack sx={{ gap: 2 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
                  <Typography variant="subtitle1">{card.typeLine}</Typography>
                  <ManaSymbols cost={card.manaCost} size={18} />
                </Stack>
                {card.oracleText && (
                  <Typography sx={{ whiteSpace: "pre-line" }} color="text.secondary">
                    {card.oracleText}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {card.rarity} · added {formatDate(entry.createdAt)} · {entry.allocated} in decks, {entry.available} free
                </Typography>
              </Stack>
            </Paper>

            <Box>
              <Typography variant="h6" component="h2" sx={{ mb: 3 }}>Your copies</Typography>
              <EntryForm
                // Reset the form when the saved entry changes
                key={entry.updatedAt}
                defaultValues={entryToForm(entry)}
                submitLabel="Save changes"
                onSubmit={(fields) => save(fields)}
                pending={update.isPending && !choosingPrinting}
                error={update.isError ? errorMessage(update.error) : null}
                actions={
                  <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmingDelete(true)}>
                    Delete
                  </Button>
                }
              />
            </Box>

            <Box>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>Decks</Typography>
              {entry.usages.length === 0 ? (
                <Typography color="text.secondary">Not used in any decks.</Typography>
              ) : (
                entry.usages.map((usage) => (
                  <Typography key={`${usage.deckId}-${usage.board}`}>
                    {usage.quantity} × in {usage.deckName} ({usage.board})
                  </Typography>
                ))
              )}
            </Box>
          </Stack>
        </Grid>
      </Grid>

      <Dialog open={choosingPrinting} onClose={() => setChoosingPrinting(false)} fullWidth maxWidth="lg" aria-labelledby="printing-title">
        <DialogTitle id="printing-title">Choose the right printing of {card.name}</DialogTitle>
        <DialogContent dividers>
          {update.isError && choosingPrinting && <Alert severity="error" sx={{ mb: 3 }}>{errorMessage(update.error)}</Alert>}
          <PrintingPicker name={card.name} selectedId={card.id} onSelect={changePrinting} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChoosingPrinting(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmingDelete} onClose={() => setConfirmingDelete(false)} aria-labelledby="delete-title">
        <DialogTitle id="delete-title">Delete {card.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes all {entry.quantity} {entry.quantity === 1 ? "copy" : "copies"} in this entry from your collection.
          </DialogContentText>
          {remove.isError && <Alert severity="error" sx={{ mt: 3 }}>{errorMessage(remove.error)}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingDelete(false)}>Cancel</Button>
          <Button color="error" variant="contained" loading={remove.isPending} onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
