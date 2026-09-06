import type { Identifier } from "ra-core";

import type { Task } from "../types";

/**
 * Reminders born from a note's next action are follow-ups: the rep already had
 * the conversation, the task is what they promised to do afterwards.
 */
export const NEXT_ACTION_TASK_TYPE = "follow-up";

/** The subset of a note this module needs — works for a contact or a deal note. */
export type NextActionNote = {
  contact_id?: Identifier | null;
  sales_id?: Identifier | null;
  next_action?: string | null;
  next_action_date?: string | null;
};

const normalize = (value?: string | null) =>
  typeof value === "string" ? value.trim() : "";

/** Two note revisions describe the same next action (so it needs no new task). */
export const isSameNextAction = (
  note?: NextActionNote | null,
  previousNote?: NextActionNote | null,
) =>
  normalize(note?.next_action) === normalize(previousNote?.next_action) &&
  normalize(note?.next_action_date) ===
    normalize(previousNote?.next_action_date);

/**
 * Builds the reminder task for a note's next action, or `null` when the note
 * cannot produce one:
 * - no next action, or no deadline to remind on;
 * - an unparsable deadline;
 * - no contact to hang the task on (a `tasks` row requires one, so a deal note
 *   records its next action without a reminder).
 */
export const buildNextActionTask = (
  note: NextActionNote,
): Omit<Task, "id"> | null => {
  const text = normalize(note.next_action);
  const dueDate = normalize(note.next_action_date);
  if (!text || !dueDate || note.contact_id == null) return null;

  const parsedDueDate = new Date(dueDate);
  if (Number.isNaN(parsedDueDate.getTime())) return null;

  return {
    contact_id: note.contact_id,
    type: NEXT_ACTION_TASK_TYPE,
    text,
    due_date: parsedDueDate.toISOString(),
    done_date: null,
    sales_id: note.sales_id ?? undefined,
  };
};
