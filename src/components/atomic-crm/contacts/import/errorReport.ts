import * as Papa from "papaparse";

/**
 * The column the report adds, to the right of the file's own columns. It holds
 * the one-line reason the row was not imported.
 *
 * Named like a column and not like a sentence so the fixed file can be handed
 * straight back to the wizard: the mapping step lists it, recognises no field
 * behind it, and leaves it out of the import.
 */
export const ERROR_REASON_COLUMN = "import_error";

/**
 * One CSV row on its way to the importer, carrying where it came from so a
 * failure can point back at the line the user has to fix.
 */
export type ImportRow<T> = {
  /**
   * Which line of the file the row came from, counting the header as line 1.
   * Blank lines are dropped before the count, so a file padded with empty
   * lines numbers its rows slightly lower than a text editor would.
   */
  rowNumber: number;
  /** The row as the file had it, before any column mapping. */
  values: T;
};

/** A row that could not be imported, kept exactly as the file had it. */
export type ImportRowFailure = {
  /** Which line of the file it came from — see `ImportRow.rowNumber`. */
  rowNumber: number;
  /** The row before any mapping, so the report can be re-imported as-is. */
  values: Record<string, unknown>;
  /** Why it was not imported, in one line. */
  reason: string;
};

/** Stands in when a failure carried no message of its own. */
export const UNKNOWN_FAILURE_REASON = "Unknown error";

/** What went wrong, as one line, from whatever the failed write threw. */
export const failureReason = (error: unknown): string => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const oneLine = message.replace(/\s+/g, " ").trim();
  return oneLine === "" ? UNKNOWN_FAILURE_REASON : oneLine;
};

/**
 * The report's columns: every column seen in the failed rows, in the order the
 * file introduced them, with the reason column last.
 *
 * A file whose own header already contains `import_error` keeps a single such
 * column, holding the reason — the report always ends with the answer to "why".
 */
const reportColumns = (failures: ImportRowFailure[]): string[] => {
  const columns = new Set<string>();
  for (const failure of failures) {
    for (const column of Object.keys(failure.values)) {
      columns.add(column);
    }
  }
  columns.delete(ERROR_REASON_COLUMN);
  return [...columns, ERROR_REASON_COLUMN];
};

/**
 * Serialises the failed rows as a CSV the user can fix and import again.
 *
 * Quoting and escaping are left to the same library that read the file, so a
 * value carrying a comma, a quote or a line break comes back out as it went in.
 * Returns an empty string when nothing failed: there is no report to write.
 */
export const buildErrorReportCsv = (failures: ImportRowFailure[]): string => {
  if (failures.length === 0) return "";

  const columns = reportColumns(failures);
  const rows = failures.map((failure) => ({
    ...failure.values,
    [ERROR_REASON_COLUMN]: failure.reason,
  }));

  return Papa.unparse(rows, { columns });
};

/** Name for the report file, next to the name of the file it came from. */
export const errorReportFileName = (sourceFileName: string): string => {
  const withoutExtension = sourceFileName.replace(/\.[^./\\]+$/, "");
  const base = withoutExtension.trim() === "" ? "contacts" : withoutExtension;
  return `${base}-errors`;
};

/** The row, as a failure: same line, same values, plus what went wrong. */
export const toRowFailure = (
  row: ImportRow<Record<string, unknown>>,
  error: unknown,
): ImportRowFailure => ({
  rowNumber: row.rowNumber,
  values: row.values,
  reason: failureReason(error),
});
