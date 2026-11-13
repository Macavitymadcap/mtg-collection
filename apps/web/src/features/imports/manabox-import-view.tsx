"use client";

import { useState, type ChangeEvent, type JSX } from "react";
import Link from "next/link";
import type { ImportSummary } from "@mtg/shared";
import UploadFileRounded from "@mui/icons-material/UploadFileRounded";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { PageHeader } from "@/components/layout/page-header";
import { errorMessage } from "@/lib/errors";
import { useManaboxImport } from "./queries";

const MAX_BYTES = 4 * 1024 * 1024;

function Summary({ summary }: { summary: ImportSummary }): JSX.Element {
  return (
    <Typography>
      {summary.rows} rows · {summary.copies} copies · {summary.created} new {summary.created === 1 ? "entry" : "entries"}
      {summary.merged > 0 && ` · ${summary.merged} added to entries you already have`}
    </Typography>
  );
}

/** Upload a ManaBox CSV, preview what it will do, then import it. */
export function ManaboxImportView(): JSX.Element {
  const run = useManaboxImport();
  const [file, setFile] = useState<{ name: string; csv: string } | null>(null);
  const [preview, setPreview] = useState<ImportSummary | null>(null);
  const [result, setResult] = useState<ImportSummary | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const choose = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const chosen = event.target.files?.[0];
    event.target.value = ""; // allow choosing the same file again
    if (!chosen) return;
    setPreview(null);
    setResult(null);
    run.reset();
    if (chosen.size > MAX_BYTES) {
      setFile(null);
      setFileError("That file is over 4 MB, which is too big for one import.");
      return;
    }
    setFileError(null);
    const csv = await chosen.text();
    setFile({ name: chosen.name, csv });
    run.mutate({ csv, dryRun: true }, { onSuccess: setPreview });
  };

  const importNow = (): void => {
    if (!file) return;
    run.mutate({ csv: file.csv, dryRun: false }, { onSuccess: setResult });
  };

  return (
    <>
      <PageHeader title="Import from ManaBox" subtitle="Add the cards from a ManaBox collection export (CSV)" />

      <Stack sx={{ gap: 4, maxWidth: 900 }}>
        <Typography color="text.secondary">
          In ManaBox, export your collection as CSV. Choose the file here to see what will be imported; nothing is saved
          until you confirm. Wrong printings, conditions and other details can be corrected on each card afterwards.
        </Typography>

        <div>
          <Button component="label" variant="outlined" startIcon={<UploadFileRounded />} disabled={run.isPending}>
            {file ? "Choose a different file" : "Choose CSV file"}
            <input type="file" accept=".csv,text/csv" hidden onChange={(event) => void choose(event)} />
          </Button>
          {file && <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">{file.name}</Typography>}
        </div>

        {fileError && <Alert severity="error">{fileError}</Alert>}
        {run.isError && <Alert severity="error">{errorMessage(run.error, "The import failed.")}</Alert>}
        {run.isPending && <Typography color="text.secondary">Checking cards with Scryfall…</Typography>}

        {result && (
          <Alert
            severity="success"
            action={<Button component={Link} href="/collection?sort=-createdAt" color="inherit">View collection</Button>}
          >
            <AlertTitle>Imported</AlertTitle>
            <Summary summary={result} />
          </Alert>
        )}

        {preview && !result && preview.errors.length === 0 && (
          <Alert
            severity="info"
            action={
              <Button variant="contained" onClick={importNow} loading={run.isPending}>
                Import {preview.copies} copies
              </Button>
            }
          >
            <AlertTitle>Ready to import</AlertTitle>
            <Summary summary={preview} />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Imports add to your collection. Importing the same file again doubles the quantities.
            </Typography>
          </Alert>
        )}

        {preview && preview.errors.length > 0 && (
          <Paper>
            <Alert severity="error" sx={{ borderRadius: 0 }}>
              <AlertTitle>
                {preview.errors.length} {preview.errors.length === 1 ? "row needs" : "rows need"} fixing. Nothing has been imported.
              </AlertTitle>
              Fix these in ManaBox (or remove them from the file), then choose the file again.
            </Alert>
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Line</TableCell>
                    <TableCell>Card</TableCell>
                    <TableCell>Problem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.errors.map((error) => (
                    <TableRow key={`${error.line}-${error.message}`}>
                      <TableCell>{error.line}</TableCell>
                      <TableCell>{error.name ?? "—"}</TableCell>
                      <TableCell>{error.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Stack>
    </>
  );
}
