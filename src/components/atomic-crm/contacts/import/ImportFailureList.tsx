import { useTranslate } from "ra-core";

import type { ImportRowFailure } from "./errorReport";

/** How many reasons are shown before the list defers to the report file. */
export const SHOWN_FAILURE_COUNT = 3;

type ImportFailureListProps = {
  failures: ImportRowFailure[];
};

/**
 * The first few reasons an import refused rows, so the user learns what went
 * wrong without opening the report first. The rest are only counted: the file
 * is where a long list belongs.
 */
export function ImportFailureList({ failures }: ImportFailureListProps) {
  const translate = useTranslate();
  const shown = failures.slice(0, SHOWN_FAILURE_COUNT);
  const hidden = failures.length - shown.length;

  return (
    <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
      {shown.map((failure) => (
        <li key={failure.rowNumber}>
          {translate("resources.contacts.import.failure_row", {
            row: failure.rowNumber,
            reason: failure.reason,
          })}
        </li>
      ))}
      {hidden > 0 && (
        <li>
          {translate("resources.contacts.import.failures_more", {
            smart_count: hidden,
          })}
        </li>
      )}
    </ul>
  );
}
