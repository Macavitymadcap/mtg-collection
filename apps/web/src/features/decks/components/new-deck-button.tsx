"use client";

import { useState, type JSX } from "react";
import { useRouter } from "next/navigation";
import AddRounded from "@mui/icons-material/AddRounded";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { errorMessage } from "@/lib/errors";
import { useCreateDeck } from "../queries";
import { DeckForm } from "./deck-form";

/** "New deck" button and dialog. Opens the builder for the new deck. */
export function NewDeckButton(): JSX.Element {
  const router = useRouter();
  const create = useCreateDeck();
  const [open, setOpen] = useState(false);

  const close = (): void => {
    setOpen(false);
    create.reset();
  };

  return (
    <>
      <Button variant="contained" startIcon={<AddRounded />} onClick={() => setOpen(true)}>
        New deck
      </Button>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="new-deck-title">
        <DialogTitle id="new-deck-title">New deck</DialogTitle>
        <DialogContent>
          <DeckForm
            submitLabel="Create"
            onCancel={close}
            pending={create.isPending}
            error={create.isError ? errorMessage(create.error) : null}
            onSubmit={(values) => create.mutate(values, { onSuccess: (deck) => router.push(`/decks/${deck.id}`) })}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
