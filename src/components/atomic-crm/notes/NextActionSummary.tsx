import { ArrowRight } from "lucide-react";
import { useTranslate } from "ra-core";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsCompactActivityLog } from "../activity/ActivityLogDensityContext";
import { RelativeDate } from "../misc/RelativeDate";
import {
  getNextActionPriority,
  type NextActionPriority,
} from "./nextActionPriority";

type NextActionSummaryNote = {
  next_action?: string | null;
  reminder_date?: string | null;
};

/**
 * Color accent per urgency level: a red tint for what is already late, a solid
 * emphasis chip for what is due today, and a quiet outline for what is merely
 * ahead. The label carries the meaning; the accent only makes it scannable.
 */
const PRIORITY_ACCENT: Record<Exclude<NextActionPriority, "none">, string> = {
  overdue: "border-destructive/30 bg-destructive/10 text-destructive",
  today: "border-transparent bg-primary text-primary-foreground",
  upcoming: "border-border bg-transparent text-muted-foreground",
};

/**
 * One-line summary of what the sales rep committed to do next after a note.
 * Rendered under the note body in the note read view, and under the note text
 * in the activity log, so both surfaces stay identical by construction.
 *
 * Renders nothing when the note carries no next action.
 */
export function NextActionSummary({ note }: { note: NextActionSummaryNote }) {
  const translate = useTranslate();
  const isCompact = useIsCompactActivityLog();

  if (!note.next_action) {
    return null;
  }

  const priority = getNextActionPriority(note.reminder_date);
  const priorityBadge =
    priority === "none" ? null : (
      <Badge className={cn("font-medium", PRIORITY_ACCENT[priority])}>
        {translate(`resources.notes.priority.${priority}`)}
      </Badge>
    );

  // A compact timeline row has room for one thing only, so it keeps the badge:
  // an overdue follow-up is exactly what a scan of the history must not lose.
  if (isCompact) {
    return (
      priorityBadge && (
        <span className="shrink-0">
          {priorityBadge}
          <span className="sr-only">
            {translate("resources.notes.fields.next_action")}:{" "}
            {note.next_action}
          </span>
        </span>
      )
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-sm">
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">
        {translate("resources.notes.fields.next_action")}
      </span>
      <span className="font-medium">{note.next_action}</span>
      {priorityBadge}
      {note.reminder_date && (
        <span className="text-muted-foreground">
          <RelativeDate date={note.reminder_date} />
        </span>
      )}
    </div>
  );
}
