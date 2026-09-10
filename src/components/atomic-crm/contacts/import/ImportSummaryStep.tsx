import { useTranslate } from "ra-core";

import { Alert, AlertDescription } from "@/components/ui/alert";

type ImportSummaryStepProps =
  | { outcome: "complete"; importCount: number; errorCount: number }
  | { outcome: "error" };

/** Step 3, finished: what happened, in one sentence. */
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
      <AlertDescription>
        {translate("resources.contacts.import.complete", {
          importCount: props.importCount,
          errorCount: props.errorCount,
        })}
      </AlertDescription>
    </Alert>
  );
}
