import { isDueToday, isOverdue } from "../tasks/tasksPredicate";

/**
 * How urgent the follow-up a note committed to is, read against today.
 * `none` means the note has no usable deadline to be urgent about.
 */
export type NextActionPriority = "overdue" | "today" | "upcoming" | "none";

/**
 * Urgency of a note's reminder date.
 *
 * Pure: the same date and clock always give the same level. It reuses the task
 * predicates so a note's next action and the task it creates agree on where the
 * day boundaries are.
 */
export function getNextActionPriority(
  reminderDate?: string | null,
): NextActionPriority {
  if (!reminderDate || Number.isNaN(new Date(reminderDate).getTime())) {
    return "none";
  }

  if (isOverdue(reminderDate)) {
    return "overdue";
  }

  if (isDueToday(reminderDate)) {
    return "today";
  }

  return "upcoming";
}
