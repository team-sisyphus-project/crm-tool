import * as Papa from "papaparse";
import { useCallback, useMemo, useRef, useState } from "react";

import type {
  ImportRow,
  ImportRowFailure,
} from "../contacts/import/errorReport";
import { toRowFailure } from "../contacts/import/errorReport";

type Import =
  | {
      state: "idle";
    }
  | {
      state: "parsing";
    }
  | {
      state: "running" | "complete";

      /**
       * How many rows the file holds. The parser counts rows, not writes: what
       * each row settled into is the caller's to report, because only the
       * caller knows whether a row was created, updated or left alone.
       */
      rowCount: number;
      /**
       * Every row that did not make it, with its line and its reason. The
       * error count is `failures.length`: one list, no counter to keep in step
       * with it.
       */
      failures: ImportRowFailure[];

      // The remaining time in milliseconds
      remainingTime: number | null;
    }
  | {
      state: "error";

      error: Error;
    };

type usePapaParseProps<T> = {
  // The import batch size
  batchSize?: number;

  /**
   * Writes one batch and reports the rows it could not write. Returning the
   * failures (rather than throwing on the first one) is what lets a batch land
   * partially: the rows that worked are kept, the rest come back with a reason.
   */
  processBatch(batch: ImportRow<T>[]): Promise<ImportRowFailure[]>;
};

/**
 * Turns the parser's own complaints into row failures.
 *
 * Only errors that point at a row are kept: those rows never reach the
 * importer, because a line the parser could not read is a line the user has to
 * fix. Errors about the file as a whole carry no row and are left to the
 * `error` callback.
 */
function parseErrorFailures<T extends Record<string, unknown>>(
  errors: Papa.ParseError[],
  rows: ImportRow<T>[],
): ImportRowFailure[] {
  const byRow = new Map<number, ImportRowFailure>();
  for (const error of errors) {
    const row = typeof error.row === "number" ? rows[error.row] : undefined;
    // The first complaint about a line is the one that explains it; the rest
    // are usually consequences of the same malformed line.
    if (!row || byRow.has(row.rowNumber)) continue;
    byRow.set(row.rowNumber, toRowFailure(row, error.message));
  }
  return [...byRow.values()];
}

export function usePapaParse<T extends Record<string, unknown>>({
  batchSize = 10,
  processBatch,
}: usePapaParseProps<T>) {
  const importIdRef = useRef<number>(0);

  const [importer, setImporter] = useState<Import>({
    state: "idle",
  });

  const reset = useCallback(() => {
    setImporter({
      state: "idle",
    });
    importIdRef.current += 1;
  }, []);

  const parseCsv = useCallback(
    (file: File) => {
      setImporter({
        state: "parsing",
      });

      const importId = importIdRef.current;
      Papa.parse<T>(file, {
        header: true,
        skipEmptyLines: true,
        async complete(results) {
          if (importIdRef.current !== importId) {
            return;
          }

          const rows: ImportRow<T>[] = results.data.map((values, index) => ({
            // The header is line 1, so the first data row is line 2 and the
            // number reads like the row gutter of a spreadsheet. Blank lines
            // are already dropped by `skipEmptyLines`, so a padded file counts
            // slightly low — close enough to find the row, and the report
            // carries the values themselves anyway.
            rowNumber: index + 2,
            values,
          }));
          const parseFailures = parseErrorFailures(results.errors, rows);
          const unreadable = new Set(
            parseFailures.map((failure) => failure.rowNumber),
          );
          const pending = rows.filter((row) => !unreadable.has(row.rowNumber));

          setImporter({
            state: "running",
            rowCount: rows.length,
            failures: parseFailures,
            remainingTime: null,
          });

          let totalTime = 0;
          let processed = 0;
          for (let i = 0; i < pending.length; i += batchSize) {
            if (importIdRef.current !== importId) {
              return;
            }

            const batch = pending.slice(i, i + batchSize);
            const start = Date.now();
            let batchFailures: ImportRowFailure[];
            try {
              batchFailures = await processBatch(batch);
            } catch (error) {
              // The batch died as a whole — a network drop, a provider that
              // refused the call — so every row in it is a row the user still
              // has to import, each with the same reason.
              console.error("Failed to import batch", error);
              batchFailures = batch.map((row) => toRowFailure(row, error));
            }
            totalTime += Date.now() - start;
            processed += batch.length;

            const meanTime = totalTime / processed;
            const remaining = pending.length - processed;
            setImporter((previous) =>
              previous.state === "running"
                ? {
                    ...previous,
                    failures: [...previous.failures, ...batchFailures],
                    remainingTime: meanTime * remaining,
                  }
                : previous,
            );
          }

          setImporter((previous) =>
            previous.state === "running"
              ? {
                  ...previous,
                  state: "complete",
                  remainingTime: null,
                }
              : previous,
          );
        },
        error(error) {
          console.error(error);
          setImporter({
            state: "error",
            error,
          });
        },
        dynamicTyping: true,
      });
    },
    [batchSize, processBatch],
  );

  return useMemo(
    () => ({
      importer,
      parseCsv,
      reset,
    }),
    [importer, parseCsv, reset],
  );
}

/** Headers and the first rows of a CSV file, read without importing anything. */
export type CsvPreview = {
  headers: string[];
  rows: Record<string, string>[];
};

/**
 * Reads the header row and the first `rowCount` data rows of a CSV file.
 *
 * Only the beginning of the file is parsed, so this stays cheap on large
 * exports and never touches the data provider. Values are returned as raw
 * strings (no `dynamicTyping`) because the preview shows the file as written.
 */
export function parseHeaders(file: File, rowCount = 5): Promise<CsvPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      preview: rowCount,
      complete(results) {
        const headers = (results.meta.fields ?? []).filter(
          (header) => header.trim() !== "",
        );
        if (headers.length === 0) {
          reject(new Error("The CSV file has no header row."));
          return;
        }
        resolve({ headers, rows: results.data });
      },
      error(error) {
        reject(error);
      },
    });
  });
}
