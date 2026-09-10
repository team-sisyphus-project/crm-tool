import { useTranslate } from "ra-core";

import { Alert, AlertDescription } from "@/components/ui/alert";

import type { ImportOutcomes } from "./duplicates";

type ImportSummaryStepProps =
  | {
      outcome: "complete";
      importCount: number;
      errorCount: number;
      /** How the rows were settled: created, updated, or skipped as duplicates. */
      outcomes: ImportOutcomes;
    }
  | { outcome: "error" };

/** Step 4, finished: what happened, in one sentence. */
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

  return (
    <Alert>
      <AlertDescription className="flex flex-col gap-1">
        <span>
          {translate("resources.contacts.import.complete", {
            importCount: props.importCount,
            errorCount: props.errorCount,
          })}
        </span>
        <span className="text-muted-foreground">
          {translate("resources.contacts.import.outcomes", props.outcomes)}
        </span>
      </AlertDescription>
    </Alert>
  );
}
