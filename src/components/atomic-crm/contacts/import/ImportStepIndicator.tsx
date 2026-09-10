import { useTranslate } from "ra-core";

import { cn } from "@/lib/utils";
import { IMPORT_STEPS } from "./useContactImportWizard";

type ImportStepIndicatorProps = {
  /** Index of the step in progress, matching `IMPORT_STEPS`. */
  currentIndex: number;
};

/** Compact "where am I" strip shown at the top of the import wizard. */
export function ImportStepIndicator({
  currentIndex,
}: ImportStepIndicatorProps) {
  const translate = useTranslate();

  return (
    <ol
      className="flex items-center gap-3 text-sm"
      aria-label={translate("resources.contacts.import.steps.label")}
    >
      {IMPORT_STEPS.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;

        return (
          <li key={step} className="flex items-center gap-3">
            {index > 0 && (
              <span aria-hidden="true" className="h-px w-6 bg-border" />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                isCurrent &&
                  "border-primary bg-primary text-primary-foreground",
                isDone && "border-primary text-primary",
                !isCurrent && !isDone && "border-border text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                isCurrent
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {translate(`resources.contacts.import.steps.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
