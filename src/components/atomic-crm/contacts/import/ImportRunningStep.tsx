import { Loader2 } from "lucide-react";
import { useTranslate } from "ra-core";
import type { MouseEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { millisecondsToTime } from "./duration";

type ImportRunningStepProps = {
  onStop(): void;
} & (
  | {
      /** The file is being read; there is nothing to count yet. */
      phase: "preparing";
    }
  | {
      phase: "running";
      rowCount: number;
      /** Rows written so far, not rows processed: a skipped duplicate is
       *  neither an import nor an error, and is counted as neither. */
      importCount: number;
      errorCount: number;
      /** Estimated milliseconds left, or null while it is still unknown. */
      remainingTime: number | null;
    }
);

/** Step 4, in progress: live counters plus a way out. */
export function ImportRunningStep(props: ImportRunningStepProps) {
  const translate = useTranslate();

  const handleStop = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    props.onStop();
  };

  return (
    <div className="flex flex-col gap-2">
      <Alert>
        <AlertDescription className="flex flex-row gap-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          {translate("resources.contacts.import.running")}
        </AlertDescription>
      </Alert>

      {/* The counters change under the user without any action of theirs, so
          they are announced, not only drawn. The region stays mounted while the
          file is still being read, so the first count is an update to it. */}
      <p className="text-sm" role="status" aria-live="polite">
        {props.phase === "preparing"
          ? translate("resources.contacts.import.reading")
          : translate("resources.contacts.import.progress", {
              importCount: props.importCount,
              rowCount: props.rowCount,
              errorCount: props.errorCount,
            })}
        {props.phase === "running" && props.remainingTime !== null && (
          <>
            {" "}
            {translate("resources.contacts.import.remaining_time")}{" "}
            <strong>{millisecondsToTime(props.remainingTime)}</strong>.
          </>
        )}
      </p>

      {/* The way out belongs to the whole run, not to the estimate: it is here
          from the first row, before any batch has been timed. */}
      <div className="text-sm">
        <button
          type="button"
          onClick={handleStop}
          className="text-destructive underline hover:text-destructive/80 cursor-pointer"
        >
          {translate("resources.contacts.import.stop")}
        </button>
      </div>
    </div>
  );
}
