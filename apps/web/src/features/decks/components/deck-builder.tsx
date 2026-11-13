"use client";

import { useState, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { boards, labels, type Board, type CollectionEntry, type DeckCard } from "@mtg/shared";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
import { ColorPips } from "@/components/cards/color-pips";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { PageHeader } from "@/components/layout/page-header";
import { errorMessage } from "@/lib/errors";
import { useDeck, useDeleteDeck, useSetDeckCard, useUpdateDeck } from "../queries";
import { AddFromCollection } from "./add-from-collection";
import { DeckBoard } from "./deck-board";
import { DeckForm } from "./deck-form";
import { DeckStats } from "./deck-stats";

/** Build a deck from owned cards: boards, quantities, stats and rule warnings. */
export function DeckBuilder({ id }: { id: number }): JSX.Element {
  const router = useRouter();
  const showMessage = useSnackbar();
  const { data: deck, isPending, isError, error } = useDeck(id);
  const setCard = useSetDeckCard(id);
  const update = useUpdateDeck(id);
  const remove = useDeleteDeck();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const back = (
    <Button component={Link} href="/decks" startIcon={<ArrowBackRounded />}>
      Decks
    </Button>
  );

  if (isPending) return <Skeleton variant="rounded" height={480} />;
  if (isError) {
    return (
      <>
        <PageHeader title="Deck not found" actions={back} />
        <Alert severity="error">{errorMessage(error, "Could not load this deck.")}</Alert>
      </>
    );
  }

  const onError = (e: Error): void => showMessage(errorMessage(e), "error");

  const add = (entry: CollectionEntry, board: Board): void => {
    const existing = deck.cards.find((card) => card.entry.id === entry.id && card.board === board);
    setCard.mutate(
      { collectionEntryId: entry.id, board, quantity: (existing?.quantity ?? 0) + 1 },
      { onError, onSuccess: () => showMessage(`Added ${entry.card.name} to ${labels.board[board].toLowerCase()}`) },
    );
  };

  const changeQuantity = (card: DeckCard, quantity: number): void => {
    setCard.mutate(
      { collectionEntryId: card.entry.id, board: card.board, quantity: Math.max(0, quantity) },
      { onError },
    );
  };

  const hasCommander = deck.cards.some((card) => card.board === "commander");
  const usedBoards = boards.filter((board) => deck.cards.some((card) => card.board === board));

  return (
    <>
      <PageHeader
        title={deck.name}
        subtitle={deck.description ?? undefined}
        actions={
          <>
            {back}
            <Button startIcon={<EditRounded />} onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          </>
        }
      />

      <Stack direction="row" sx={{ gap: 2, alignItems: "center", mb: 4, flexWrap: "wrap" }}>
        <Chip label={labels.format[deck.format]} />
        <Chip variant="outlined" label={`${deck.cardCount} cards`} />
        {deck.cards.length > 0 && <ColorPips colors={deck.colorIdentity} />}
      </Stack>

      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack sx={{ gap: 4 }}>
            <Paper sx={{ p: 4 }}>
              <AddFromCollection
                key={hasCommander ? "main" : "commander"}
                defaultBoard={deck.format === "commander" && !hasCommander ? "commander" : "main"}
                disabled={setCard.isPending}
                onAdd={add}
              />
            </Paper>

            {deck.warnings.length > 0 && (
              <Alert severity="warning">
                <AlertTitle>
                  {deck.warnings.length} {deck.warnings.length === 1 ? "thing to check" : "things to check"}
                </AlertTitle>
                <Stack component="ul" sx={{ m: 0, pl: 4 }}>
                  {deck.warnings.map((warning, i) => (
                    <li key={i}>{warning.message}</li>
                  ))}
                </Stack>
              </Alert>
            )}

            {usedBoards.length === 0 ? (
              <Typography color="text.secondary">No cards yet. Search your collection above to add some.</Typography>
            ) : (
              usedBoards.map((board) => (
                <DeckBoard
                  key={board}
                  board={board}
                  cards={deck.cards.filter((card) => card.board === board)}
                  disabled={setCard.isPending}
                  onQuantity={changeQuantity}
                />
              ))
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <DeckStats stats={deck.stats} />
        </Grid>
      </Grid>

      <Dialog
        open={editing}
        onClose={() => setEditing(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="edit-deck-title"
      >
        <DialogTitle id="edit-deck-title">Edit deck</DialogTitle>
        <DialogContent>
          <DeckForm
            defaultValues={deck}
            submitLabel="Save"
            onCancel={() => setEditing(false)}
            pending={update.isPending}
            error={update.isError ? errorMessage(update.error) : null}
            onSubmit={(values) => update.mutate(values, { onSuccess: () => setEditing(false) })}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={confirmingDelete} onClose={() => setConfirmingDelete(false)} aria-labelledby="delete-deck-title">
        <DialogTitle id="delete-deck-title">Delete {deck.name}?</DialogTitle>
        <DialogContent>
          <DialogContentText>The deck is deleted. Its cards stay in your collection.</DialogContentText>
          {remove.isError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {errorMessage(remove.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmingDelete(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(id, {
                onSuccess: () => {
                  showMessage(`Deleted ${deck.name}`);
                  router.push("/decks");
                },
              })
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
