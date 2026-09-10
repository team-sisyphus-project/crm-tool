import { useCallback, useMemo, useRef, useState } from "react";

import type { CsvPreview } from "../../misc/usePapaParse";
import { parseHeaders, usePapaParse } from "../../misc/usePapaParse";
import type { ContactImportSchema } from "../useContactImport";
import { useContactImport } from "../useContactImport";

/** Number of contacts sent to the data provider per round-trip. */
export const IMPORT_BATCH_SIZE = 10;

/** Number of rows the preview step reads from the file. */
export const PREVIEW_ROW_COUNT = 5;

/**
 * The wizard walks through these steps in order. "summary" is the terminal
 * state of the "import" step, so it shares its position in the indicator.
 */
export const IMPORT_STEPS = ["upload", "preview", "import"] as const;

export type ImportStep = "upload" | "preview" | "running" | "summary";

/**
 * The file the user picked, and what we learned by reading its first rows.
 * The wizard step is derived from this plus the importer state, so the two can
 * never disagree.
 */
type SourceState =
  | { status: "empty" }
  | { status: "reading"; file: File }
  | { status: "ready"; file: File; preview: CsvPreview }
  | { status: "invalid"; file: File; error: Error };

const stepPosition = (step: ImportStep): number =>
  step === "upload" ? 0 : step === "preview" ? 1 : 2;

const toStep = (source: SourceState, importerState: string): ImportStep => {
  if (importerState === "parsing" || importerState === "running") {
    return "running";
  }
  if (importerState === "complete" || importerState === "error") {
    return "summary";
  }
  return source.status === "ready" ? "preview" : "upload";
};

/**
 * Single state machine behind the contact import wizard: it owns the selected
 * file, its preview, and the running import, and exposes the derived step so
 * the dialog only has to render.
 */
export function useContactImportWizard() {
  const processBatch = useContactImport();
  const { importer, parseCsv, reset } = usePapaParse<ContactImportSchema>({
    batchSize: IMPORT_BATCH_SIZE,
    processBatch,
  });

  const [source, setSource] = useState<SourceState>({ status: "empty" });
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
      setSource({ status: "ready", file, preview });
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

  const startImport = useCallback(() => {
    if (source.status !== "ready") return;
    parseCsv(source.file);
  }, [parseCsv, source]);

  /** Back to the upload step: the selection is dropped so both stay in sync. */
  const goToUpload = useCallback(() => {
    readIdRef.current += 1;
    setSource({ status: "empty" });
  }, []);

  /** Stops a running import and returns to the preview of the same file. */
  const stopImport = useCallback(() => {
    reset();
  }, [reset]);

  /** Full reset, so reopening the dialog always starts from a blank slate. */
  const resetWizard = useCallback(() => {
    readIdRef.current += 1;
    reset();
    setSource({ status: "empty" });
  }, [reset]);

  const step = toStep(source, importer.state);

  return useMemo(
    () => ({
      importer,
      step,
      stepIndex: stepPosition(step),
      file: source.status === "empty" ? null : source.file,
      preview: source.status === "ready" ? source.preview : null,
      isReadingFile: source.status === "reading",
      previewError: source.status === "invalid" ? source.error : null,
      selectFile,
      startImport,
      goToUpload,
      stopImport,
      resetWizard,
    }),
    [
      importer,
      step,
      source,
      selectFile,
      startImport,
      goToUpload,
      stopImport,
      resetWizard,
    ],
  );
}

export type ContactImportWizard = ReturnType<typeof useContactImportWizard>;
