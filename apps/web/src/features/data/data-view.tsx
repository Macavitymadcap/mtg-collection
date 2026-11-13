"use client";

import { useState, type ChangeEvent, type JSX } from "react";
import Link from "next/link";
import type { BackupImportSummary, DataCounts } from "@mtg/shared";
import DownloadRounded from "@mui/icons-material/DownloadRounded";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { isResponseError } from "up-fetch";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { PageHeader } from "@/components/layout/page-header";
import { errorMessage } from "@/lib/errors";
import { useBackupImport, useDataCounts, useDownloadExport } from "./queries";

const rows: { key: keyof DataCounts; label: string }[] = [
  { key: "entries", label: "Collection entries" },
  { key: "copies", label: "Copies" },
  { key: "cards", label: "Printings" },
  { key: "decks", label: "Decks" },
  { key: "deckCards", label: "Deck lines" },
];

const describe = (counts: DataCounts): string =>
  `${counts.entries} entries (${counts.copies} copies) and ${counts.decks} ${counts.decks === 1 ? "deck" : "decks"}`;

/** The problems the API listed for an invalid file, if that's what the error is. */
function fileProblems(error: unknown): { path: string; message: string }[] {
  if (!isResponseError(error)) return [];
  const data: unknown = error.data;
  if (typeof data !== "object" || data === null || !("details" in data) || !Array.isArray(data.details)) return [];
  return (data.details as unknown[]).flatMap((item) =>
    typeof item === "object" && item !== null && "path" in item && "message" in item
      ? [{ path: String(item.path), message: String(item.message) }]
      : [],
  );
}

function Comparison({ summary }: { summary: BackupImportSummary }): JSX.Element {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell />
          <TableCell align="right">Now</TableCell>
          <TableCell align="right">In the file</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map(({ key, label }) => (
          <TableRow key={key}>
            <TableCell>{label}</TableCell>
            <TableCell align="right">{summary.replaced[key]}</TableCell>
            <TableCell align="right">{summary.incoming[key]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Export the whole database to JSON, or replace it from an export. */
export function DataView(): JSX.Element {
  const showMessage = useSnackbar();
  const counts = useDataCounts();
  const download = useDownloadExport();
  const check = useBackupImport();
  const load = useBackupImport();
  const [file, setFile] = useState<{ name: string; content: unknown } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const choose = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const chosen = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!chosen) return;
    check.reset();
    load.reset();
    setFile(null);
    try {
      const content: unknown = JSON.parse(await chosen.text());
      setReadError(null);
      setFile({ name: chosen.name, content });
      check.mutate({ file: content, dryRun: true });
    } catch {
      setReadError(`${chosen.name} isn't a JSON file.`);
    }
  };

  const replace = (): void => {
    if (!file) return;
    load.mutate(
      { file: file.content, dryRun: false },
      {
        onSuccess: (summary) => {
          setConfirming(false);
          setFile(null);
          check.reset();
          showMessage(`Loaded ${describe(summary.incoming)}`);
        },
      },
    );
  };

  const problems = fileProblems(check.error);

  return (
    <>
      <PageHeader title="Data" subtitle="Back up your collection and decks, or move them to another installation" />

      <Stack sx={{ gap: 6, maxWidth: 800 }}>
        <Alert severity="info">
          To add cards from ManaBox or a preconstructed deck, use{" "}
          <Link href="/collection/import">Collection → Import</Link>. This page replaces everything.
        </Alert>

        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            Export
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Downloads everything as one JSON file: your collection (with prices, flags and notes), your decks, and the
            card data they use, so it can be loaded without Scryfall.
            {counts.data && ` Currently ${describe(counts.data)}.`}
          </Typography>
          {download.isError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage(download.error, "The export failed.")}
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<DownloadRounded />}
            loading={download.isPending}
            onClick={() => download.mutate()}
          >
            Export JSON
          </Button>
        </Paper>

        <Paper sx={{ p: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            Replace from an export
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Loads an export file in place of everything currently here. Choose a file to check it first; nothing changes
            until you confirm.
          </Typography>

          <Stack sx={{ gap: 3 }}>
            <div>
              <Button component="label" variant="outlined" startIcon={<UploadFileRounded />} disabled={check.isPending}>
                {file ? "Choose a different file" : "Choose export file"}
                <input type="file" accept=".json,application/json" hidden onChange={(event) => void choose(event)} />
              </Button>
              {file && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {file.name}
                </Typography>
              )}
            </div>

            {readError && <Alert severity="error">{readError}</Alert>}
            {check.isPending && <Typography color="text.secondary">Checking the file…</Typography>}

            {check.isError && (
              <Alert severity="error">
                <AlertTitle>{errorMessage(check.error, "Could not check the file.")}</AlertTitle>
                {problems.length > 0 && (
                  <Stack component="ul" sx={{ m: 0, pl: 4, maxHeight: 240, overflowY: "auto" }}>
                    {problems.map((problem, i) => (
                      <li key={i}>
                        <code>{problem.path || "(file)"}</code>: {problem.message}
                      </li>
                    ))}
                  </Stack>
                )}
              </Alert>
            )}

            {check.data && file && (
              <>
                <Comparison summary={check.data} />
                <div>
                  <Button color="error" variant="contained" onClick={() => setConfirming(true)}>
                    Replace everything
                  </Button>
                </div>
              </>
            )}
          </Stack>
        </Paper>
      </Stack>

      <Dialog open={confirming} onClose={() => setConfirming(false)} aria-labelledby="replace-title">
        <DialogTitle id="replace-title">Replace everything?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {check.data &&
              `This deletes your ${describe(check.data.replaced)}, and loads ${describe(check.data.incoming)} from ${file?.name ?? "the file"}. `}
            It can&apos;t be undone, so export first if you might want what&apos;s here now.
          </DialogContentText>
          {load.isError && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {errorMessage(load.error, "The import failed. Nothing was changed.")}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(false)}>Cancel</Button>
          <Button color="error" variant="contained" loading={load.isPending} onClick={replace}>
            Replace everything
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
