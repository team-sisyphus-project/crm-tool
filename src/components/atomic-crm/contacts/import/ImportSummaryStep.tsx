import { useTranslate } from "ra-core";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import type { ImportOutcomes } from "./duplicates";
import type { ImportRowFailure } from "./errorReport";
import { ImportFailureList } from "./ImportFailureList";

type ImportSummaryStepProps =
  | {
      outcome: "complete";
      /** Rows the CRM wrote: `outcomes.created + outcomes.updated`, never the
       *  number of rows read — a skipped duplicate was read and not written. */
      importCount: number;
      /** How the rows were settled: created, updated, or skipped as duplicates. */
      outcomes: ImportOutcomes;
      /** The rows that did not go through, with the line and the reason. */
      failures: ImportRowFailure[];
      onDownloadFailures(): void;
    }
  | { outcome: "error" };

/** Step 4, finished: what happened, and what to do about what did not. */
export function ImportSummaryStep(props: ImportSummaryStepProps) {
  const translate = useTranslate();

  if (props.outcome === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {translate("resources.contacts.import.error")}
        </AlertDescription>
      </Alert>
    );
  }

  const { failures } = props;

  return (
    <div className="flex flex-col gap-2">
      <Alert>
        <AlertDescription className="flex flex-col gap-1">
          <span>
            {translate("resources.contacts.import.complete", {
              importCount: props.importCount,
              errorCount: failures.length,
            })}
          </span>
          <span className="text-muted-foreground">
            {translate("resources.contacts.import.outcomes", props.outcomes)}
          </span>
        </AlertDescription>
      </Alert>

      {failures.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {translate("resources.contacts.import.failures_hint")}
          </p>
          <ImportFailureList failures={failures} />
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={props.onDownloadFailures}
            >
              {translate("resources.contacts.import.download_failures")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
