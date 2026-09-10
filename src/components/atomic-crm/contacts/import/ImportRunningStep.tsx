import { Loader2 } from "lucide-react";
import { useTranslate } from "ra-core";
import type { MouseEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { millisecondsToTime } from "./duration";

type ImportRunningStepProps = {
  rowCount: number;
  importCount: number;
  errorCount: number;
  /** Estimated milliseconds left, or null while it is still unknown. */
  remainingTime: number | null;
  onStop(): void;
};

/** Step 4, in progress: live counters plus a way out. */
export function ImportRunningStep({
  rowCount,
  importCount,
  errorCount,
  remainingTime,
  onStop,
}: ImportRunningStepProps) {
  const translate = useTranslate();

  const handleStop = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onStop();
  };

  return (
    <div className="flex flex-col gap-2">
      <Alert>
        <AlertDescription className="flex flex-row gap-4">
          <Loader2 className="h-5 w-5 animate-spin" />
          {translate("resources.contacts.import.running")}
        </AlertDescription>
      </Alert>

      <div className="text-sm">
        {translate("resources.contacts.import.progress", {
          importCount,
          rowCount,
          errorCount,
        })}
        {remainingTime !== null && (
          <>
            {" "}
            {translate("resources.contacts.import.remaining_time")}{" "}
            <strong>{millisecondsToTime(remainingTime)}</strong>.{" "}
            <button
              onClick={handleStop}
              className="text-destructive underline hover:text-destructive/80 cursor-pointer"
            >
              {translate("resources.contacts.import.stop")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
