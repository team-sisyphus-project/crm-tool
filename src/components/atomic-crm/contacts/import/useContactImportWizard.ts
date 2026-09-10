import { useCallback, useMemo, useRef, useState } from "react";

import { downloadCSV } from "ra-core";

import type { CsvPreview } from "../../misc/usePapaParse";
import { parseHeaders, usePapaParse } from "../../misc/usePapaParse";
import type { ColumnMapping, CsvRow, ImportField } from "./columnMapping";
import {
  applyMapping,
  autoMapColumns,
  missingRequiredFields,
  setColumnField,
} from "./columnMapping";
import type { DuplicatePolicy } from "./duplicates";
import { DEFAULT_DUPLICATE_POLICY } from "./duplicates";
import type { ImportRow, ImportRowFailure } from "./errorReport";
import { buildErrorReportCsv, errorReportFileName } from "./errorReport";
import { useContactImport } from "../useContactImport";

/** Number of contacts sent to the data provider per round-trip. */
export const IMPORT_BATCH_SIZE = 10;

/** Stable empty list, so a wizard with no failures keeps a stable identity. */
const NO_FAILURES: ImportRowFailure[] = [];

/** Number of rows the preview step reads from the file. */
export const PREVIEW_ROW_COUNT = 5;

/**
 * The wizard walks through these steps in order. "summary" is the terminal
 * state of the "import" step, so it shares its position in the indicator.
 */
export const IMPORT_STEPS = ["upload", "preview", "mapping", "import"] as const;

export type ImportStep =
  | "upload"
  | "preview"
  | "mapping"
  | "running"
  | "summary";

/**
 * The file the user picked, what we learned by reading its first rows, and —
 * once they move past the preview — where each of its columns goes. The wizard
 * step is derived from this plus the importer state, so the two can never
 * disagree.
 */
type SourceState =
  | { status: "empty" }
  | { status: "reading"; file: File }
  | {
      status: "ready";
      file: File;
      preview: CsvPreview;
      /** `null` until the user leaves the preview: that is what opens mapping. */
      mapping: ColumnMapping | null;
    }
  | { status: "invalid"; file: File; error: Error };

const stepPosition = (step: ImportStep): number =>
  step === "upload" ? 0 : step === "preview" ? 1 : step === "mapping" ? 2 : 3;

const toStep = (source: SourceState, importerState: string): ImportStep => {
  if (importerState === "parsing" || importerState === "running") {
    return "running";
  }
  if (importerState === "complete" || importerState === "error") {
    return "summary";
  }
  if (source.status !== "ready") return "upload";
  return source.mapping === null ? "preview" : "mapping";
};

/**
 * Single state machine behind the contact import wizard: it owns the selected
 * file, its preview, the column mapping and the running import, and exposes the
 * derived step so the dialog only has to render.
 */
export function useContactImportWizard() {
  const { processBatch, outcomes, startRun } = useContactImport();
  // The mapping and duplicate policy in force for the import currently running.
  // Held in refs so editing either does not rebuild the parser's batch callback,
  // and so a running import keeps the settings it was started with.
  const activeMappingRef = useRef<ColumnMapping | null>(null);
  const activePolicyRef = useRef<DuplicatePolicy>(DEFAULT_DUPLICATE_POLICY);

  const processMappedBatch = useCallback(
    async (batch: ImportRow<CsvRow>[]): Promise<ImportRowFailure[]> => {
      const mapping = activeMappingRef.current;
      if (mapping === null) {
        throw new Error("The import started without a column mapping.");
      }
      const failures = await processBatch(
        batch.map((row) => applyMapping(row.values, mapping)),
        activePolicyRef.current,
      );
      // The importer answers in batch positions; the report needs the line the
      // user has to fix and the values their file actually holds — not the
      // mapped ones, so the report can be corrected and imported again as-is.
      return failures.map(({ index, reason }) => ({
        rowNumber: batch[index].rowNumber,
        values: batch[index].values,
        reason,
      }));
    },
    [processBatch],
  );

  const { importer, parseCsv, reset } = usePapaParse<CsvRow>({
    batchSize: IMPORT_BATCH_SIZE,
    processBatch: processMappedBatch,
  });

  const [source, setSource] = useState<SourceState>({ status: "empty" });
  // What to do with rows matching a contact already in the CRM. One choice for
  // the whole run, made before it starts.
  const [duplicatePolicy, setDuplicatePolicy] = useState<DuplicatePolicy>(
    DEFAULT_DUPLICATE_POLICY,
  );
  // Guards against a slow preview of a discarded file overwriting a newer one.
  const readIdRef = useRef(0);

  const selectFile = useCallback(async (file: File | null) => {
    readIdRef.current += 1;
    const readId = readIdRef.current;

    if (!file) {
      setSource({ status: "empty" });
      return;
    }

    setSource({ status: "reading", file });
    try {
      const preview = await parseHeaders(file, PREVIEW_ROW_COUNT);
      if (readIdRef.current !== readId) return;
      setSource({ status: "ready", file, preview, mapping: null });
    } catch (error) {
      if (readIdRef.current !== readId) return;
      console.error("Failed to preview the CSV file", error);
      setSource({
        status: "invalid",
        file,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }, []);

  /**
   * Leaves the preview for the mapping step, by producing the thing that step
   * needs: a first guess at where the file's columns go.
   */
  const goToMapping = useCallback(() => {
    setSource((current) =>
      current.status === "ready" && current.mapping === null
        ? { ...current, mapping: autoMapColumns(current.preview.headers) }
        : current,
    );
  }, []);

  /** Back to the preview: dropping the mapping is what shows that step again. */
  const goToPreview = useCallback(() => {
    setSource((current) =>
      current.status === "ready" ? { ...current, mapping: null } : current,
    );
  }, []);

  /** Re-points one column at a field, or at `null` to leave it out. */
  const mapColumn = useCallback((header: string, field: ImportField | null) => {
    setSource((current) =>
      current.status === "ready" && current.mapping !== null
        ? {
            ...current,
            mapping: setColumnField(current.mapping, header, field),
          }
        : current,
    );
  }, []);

  const mapping = source.status === "ready" ? source.mapping : null;
  const missingFields = useMemo(
    () => (mapping === null ? [] : missingRequiredFields(mapping)),
    [mapping],
  );
  const canStartImport = mapping !== null && missingFields.length === 0;

  const startImport = useCallback(() => {
    if (source.status !== "ready" || source.mapping === null) return;
    if (missingRequiredFields(source.mapping).length > 0) return;
    activeMappingRef.current = source.mapping;
    activePolicyRef.current = duplicatePolicy;
    startRun();
    parseCsv(source.file);
  }, [duplicatePolicy, parseCsv, source, startRun]);

  /** Back to the upload step: the selection is dropped so both stay in sync. */
  const goToUpload = useCallback(() => {
    readIdRef.current += 1;
    setSource({ status: "empty" });
  }, []);

  /** Stops a running import and returns to the mapping of the same file. */
  const stopImport = useCallback(() => {
    reset();
  }, [reset]);

  /** Full reset, so reopening the dialog always starts from a blank slate. */
  const resetWizard = useCallback(() => {
    readIdRef.current += 1;
    activeMappingRef.current = null;
    activePolicyRef.current = DEFAULT_DUPLICATE_POLICY;
    reset();
    setSource({ status: "empty" });
    setDuplicatePolicy(DEFAULT_DUPLICATE_POLICY);
  }, [reset]);

  const failures =
    importer.state === "running" || importer.state === "complete"
      ? importer.failures
      : NO_FAILURES;

  const fileName = source.status === "empty" ? null : source.file.name;

  /** Hands the failed rows back as a CSV the user can fix and import again. */
  const downloadErrorReport = useCallback(() => {
    if (failures.length === 0) return;
    downloadCSV(
      buildErrorReportCsv(failures),
      errorReportFileName(fileName ?? "contacts"),
    );
  }, [failures, fileName]);

  const step = toStep(source, importer.state);

  return useMemo(
    () => ({
      importer,
      step,
      stepIndex: stepPosition(step),
      file: source.status === "empty" ? null : source.file,
      preview: source.status === "ready" ? source.preview : null,
      mapping,
      missingFields,
      canStartImport,
      duplicatePolicy,
      setDuplicatePolicy,
      outcomes,
      failures,
      downloadErrorReport,
      isReadingFile: source.status === "reading",
      previewError: source.status === "invalid" ? source.error : null,
      selectFile,
      goToMapping,
      goToPreview,
      mapColumn,
      startImport,
      goToUpload,
      stopImport,
      resetWizard,
    }),
    [
      importer,
      step,
      source,
      mapping,
      missingFields,
      canStartImport,
      duplicatePolicy,
      outcomes,
      failures,
      downloadErrorReport,
      selectFile,
      goToMapping,
      goToPreview,
      mapColumn,
      startImport,
      goToUpload,
      stopImport,
      resetWizard,
    ],
  );
}

export type ContactImportWizard = ReturnType<typeof useContactImportWizard>;
