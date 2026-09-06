import { datatype, lorem } from "faker/locale/en_US";

import { weightedBoolean } from "./utils";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/** Share of generated notes that carry a next action, in percent. */
const NEXT_ACTION_LIKELIHOOD = 30;

/** Window, in days, between a note and the next action it schedules. */
const NEXT_ACTION_MIN_DELAY_DAYS = 1;
const NEXT_ACTION_MAX_DELAY_DAYS = 14;

export type GeneratedNextAction = {
  next_action: string | null;
  reminder_date: string | null;
};

/**
 * Generate the optional next-action pair of a note.
 *
 * Both fields are always set together: a note either carries a next action with
 * its due date, or neither. `reminder_date` always falls after `noteDate`.
 */
export const generateNextAction = (noteDate: Date): GeneratedNextAction => {
  if (!weightedBoolean(NEXT_ACTION_LIKELIHOOD)) {
    return { next_action: null, reminder_date: null };
  }

  const delayInDays = datatype.number({
    min: NEXT_ACTION_MIN_DELAY_DAYS,
    max: NEXT_ACTION_MAX_DELAY_DAYS,
  });

  return {
    next_action: lorem.sentence(),
    reminder_date: new Date(
      noteDate.getTime() + delayInDays * DAY_IN_MS,
    ).toISOString(),
  };
};
