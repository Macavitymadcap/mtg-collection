/** Body for importing a ManaBox collection export. */
export interface ManaboxImportRequest {
  /** The CSV file's contents. */
  csv: string;
}

/** A row that couldn't be imported. Line numbers count the header as line 1. */
export interface ImportRowError {
  line: number;
  name: string | null;
  message: string;
}

export interface ImportSummary {
  /** Data rows in the file. */
  rows: number;
  /** Copies across all valid rows. */
  copies: number;
  /** Entries that don't exist yet and will be (or were) created. */
  created: number;
  /** Entries that already exist; the file's quantities are added to them. */
  merged: number;
  /** Rows that were rejected. Nothing is imported unless this is empty. */
  errors: ImportRowError[];
  /** True if nothing was written. */
  dryRun: boolean;
}
