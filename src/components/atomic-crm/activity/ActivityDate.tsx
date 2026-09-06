import { RelativeDate } from "../misc/RelativeDate";
import { useIsCompactActivityLog } from "./ActivityLogDensityContext";

/**
 * Relative date printed inside the sentence of an activity item.
 *
 * Compact rows print the date once in the timeline gutter, right-aligned, so the
 * item itself renders nothing there — this keeps every item component free of
 * density branching.
 */
export function ActivityDate({ date }: { date: string }) {
  const isCompact = useIsCompactActivityLog();

  if (isCompact) {
    return null;
  }

  return <RelativeDate date={date} />;
}

/** Same date, right-aligned next to the sentence instead of inside it. */
export function ActivityDateGutter({ date }: { date: string }) {
  const isCompact = useIsCompactActivityLog();

  if (isCompact) {
    return null;
  }

  return (
    <span className="text-muted-foreground text-sm">
      <RelativeDate date={date} />
    </span>
  );
}
