"use client";

import { useEffect, useState, type JSX } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { boards, labels, type Board, type CollectionEntry, type DeckCard } from "@mtg/shared";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import UnfoldLessRounded from "@mui/icons-material/UnfoldLessRounded";
import UnfoldMoreRounded from "@mui/icons-material/UnfoldMoreRounded";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Badge from "@mui/material/Badge";
import Drawer from "@mui/material/Drawer";
import Fab from "@mui/material/Fab";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import { ColorPips } from "@/components/cards/color-pips";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/page-states";
import { PageHeader } from "@/components/layout/page-header";
import { errorMessage } from "@/lib/errors";
import { useIsMobile } from "@/lib/use-is-mobile";
import { useDeck, useDeleteDeck, useSetDeckCard, useUpdateDeck } from "../queries";
import { AddFromCollection } from "./add-from-collection";
import { DeckBoard, sectionKeys } from "./deck-board";
import { DeckForm } from "./deck-form";
import { DeckStats } from "./deck-stats";

type MobileTab = "cards" | "stats" | "check";

/**
 * Which deck sections are collapsed, remembered per deck in this browser.
 * Starts all open (the server can't know), then applies what was saved.
 */
function useCollapsedSections(deckId: number): [ReadonlySet<string>, (next: ReadonlySet<string>) => void, boolean] {
  const storageKey = `deck-sections-collapsed:${deckId}`;
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  // False until the saved state has been applied, so that's applied without animating
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after mount
      if (saved) setCollapsed(new Set(JSON.parse(saved) as string[]));
    } catch {
      // Storage unavailable or corrupt: keep everything open
    }
    setRestored(true);
  }, [storageKey]);

  const update = (next: ReadonlySet<string>): void => {
    setCollapsed(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // Not remembered; still works for this visit
    }
  };
  return [collapsed, update, restored];
}

/** Build a deck from owned cards: boards, quantities, stats and rule warnings. */
export function DeckBuilder({ id }: { id: number }): JSX.Element {
  const router = useRouter();
  const showMessage = useSnackbar();
  const { data: deck, isPending, isError, error } = useDeck(id);
  const setCard = useSetDeckCard(id);
  const update = useUpdateDeck(id);
  const remove = useDeleteDeck();
  const [editing, setEditing] = useState(false);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<MobileTab>("cards");
  const [collapsed, setCollapsed, sectionsRestored] = useCollapsedSections(id);
  const [adding, setAdding] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const back = (
    <Button component={Link} href="/decks" startIcon={<ArrowBackRounded />}>
      Decks
    </Button>
  );

  if (isPending) return <LoadingState />;
  if (isError) {
    return (
      <>
        <PageHeader title="Deck not found" actions={back} />
        <ErrorState error={error} fallback="Could not load this deck." />
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
  const allSections = usedBoards.flatMap((board) =>
    sectionKeys(
      board,
      deck.cards.filter((card) => card.board === board),
    ),
  );

  const addPanel = (
    <AddFromCollection
      key={hasCommander ? "main" : "commander"}
      defaultBoard={deck.format === "commander" && !hasCommander ? "commander" : "main"}
      disabled={setCard.isPending}
      onAdd={add}
    />
  );

  const warnings = deck.warnings.length > 0 && (
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
  );

  const boardList =
    usedBoards.length === 0 ? (
      <EmptyState
        title="No cards yet"
        message={isMobile ? "Use + to add cards from your collection." : "Search your collection above to add some."}
      />
    ) : (
      <>
        <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1, mb: -2 }}>
          <Button size="small" startIcon={<UnfoldLessRounded />} onClick={() => setCollapsed(new Set(allSections))}>
            Collapse all
          </Button>
          <Button size="small" startIcon={<UnfoldMoreRounded />} onClick={() => setCollapsed(new Set())}>
            Expand all
          </Button>
        </Stack>
        {usedBoards.map((board) => (
          <DeckBoard
            key={board}
            board={board}
            cards={deck.cards.filter((card) => card.board === board)}
            disabled={setCard.isPending}
            onQuantity={changeQuantity}
            collapsed={collapsed}
            animate={sectionsRestored}
            onToggle={(key) => {
              const next = new Set(collapsed);
              if (!next.delete(key)) next.add(key);
              setCollapsed(next);
            }}
          />
        ))}
      </>
    );

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

      {isMobile ? (
        <>
          <Tabs value={tab} onChange={(_event, value: MobileTab) => setTab(value)} variant="fullWidth" sx={{ mb: 4 }}>
            <Tab value="cards" label={`Cards (${deck.cardCount})`} />
            <Tab value="stats" label="Stats" />
            <Tab
              value="check"
              label={
                <Badge badgeContent={deck.warnings.length} color="warning" sx={{ "& .MuiBadge-badge": { right: -12 } }}>
                  Check
                </Badge>
              }
            />
          </Tabs>
          {tab === "cards" && <Stack sx={{ gap: 4 }}>{boardList}</Stack>}
          {tab === "stats" && <DeckStats stats={deck.stats} />}
          {tab === "check" &&
            (warnings || <EmptyState title="Nothing to check" message="The deck follows its format's rules." />)}

          {/* Above the bottom navigation bar */}
          <Fab
            color="primary"
            aria-label="Add from your collection"
            onClick={() => setAdding(true)}
            sx={{ position: "fixed", right: 16, bottom: "calc(56px + env(safe-area-inset-bottom) + 16px)" }}
          >
            <AddRounded />
          </Fab>
          <Drawer
            anchor="bottom"
            open={adding}
            onClose={() => setAdding(false)}
            slotProps={{ paper: { sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 4, pb: 8 } } }}
          >
            <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
              Add from your collection
            </Typography>
            {addPanel}
          </Drawer>
        </>
      ) : (
        <Grid container spacing={6}>
          <Grid size={{ md: 8 }}>
            <Stack sx={{ gap: 4 }}>
              <Paper sx={{ p: 4 }}>{addPanel}</Paper>
              {warnings}
              {boardList}
            </Stack>
          </Grid>
          <Grid size={{ md: 4 }}>
            <DeckStats stats={deck.stats} />
          </Grid>
        </Grid>
      )}

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
