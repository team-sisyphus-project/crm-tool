import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { RelativeDate } from "../misc/RelativeDate";

type ActivityLogTimelineRowProps = {
  date: string;
  /** The rail is trimmed at the first and last dot so it reads as one thread. */
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
};

/**
 * One dense row of the compact activity timeline: connector rail, dot, the
 * activity item clamped to a single line, and its relative date on the right.
 */
export function ActivityLogTimelineRow({
  date,
  isFirst,
  isLast,
  children,
}: ActivityLogTimelineRowProps) {
  return (
    <li className="relative flex items-center gap-3 py-1 pl-6">
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-1 w-px -translate-x-1/2 bg-border",
          isFirst ? "top-1/2" : "top-0",
          isLast ? "bottom-1/2" : "bottom-0",
        )}
      />
      <span
        aria-hidden="true"
        className="absolute left-1 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border"
      />
      <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">
        {children}
      </div>
      <span className="shrink-0 text-muted-foreground text-sm">
        <RelativeDate date={date} />
      </span>
    </li>
  );
}
