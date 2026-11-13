import type { JSX } from "react";
import type { ImportRowError } from "@mtg/shared";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

interface ImportErrorsProps {
  errors: ImportRowError[];
  /** What to do about them. */
  advice: string;
  /** Column heading for the row number, e.g. "Line". */
  lineLabel?: string;
}

/** The rows an import rejected. Nothing is imported while there are any. */
export function ImportErrors({ errors, advice, lineLabel = "Line" }: ImportErrorsProps): JSX.Element {
  return (
    <Paper>
      <Alert severity="error" sx={{ borderRadius: 0 }}>
        <AlertTitle>
          {errors.length} {errors.length === 1 ? "problem" : "problems"} to fix. Nothing has been imported.
        </AlertTitle>
        {advice}
      </Alert>
      <TableContainer sx={{ maxHeight: 480 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{lineLabel}</TableCell>
              <TableCell>Card</TableCell>
              <TableCell>Problem</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {errors.map((error) => (
              <TableRow key={`${error.line}-${error.message}`}>
                {/* Line 0 is a problem with the import as a whole, such as a taken deck name */}
                <TableCell>{error.line || "—"}</TableCell>
                <TableCell>{error.name ?? "—"}</TableCell>
                <TableCell>{error.message}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
