import { ArrowRight } from "lucide-react";
import { useTranslate } from "ra-core";

import { RelativeDate } from "../misc/RelativeDate";

type NextActionSummaryNote = {
  next_action?: string | null;
  next_action_date?: string | null;
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

  if (!note.next_action) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 text-sm">
      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">
        {translate("resources.notes.fields.next_action")}
      </span>
      <span className="font-medium">{note.next_action}</span>
      {note.next_action_date && (
        <span className="text-muted-foreground">
          <RelativeDate date={note.next_action_date} />
        </span>
      )}
    </div>
  );
}
