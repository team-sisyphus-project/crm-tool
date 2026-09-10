import { format } from "date-fns";

import type { DealStage } from "../types";

export const findDealLabel = (dealStages: DealStage[], dealValue: string) => {
  const dealStage = dealStages.find((stage) => stage.value === dealValue);
  return dealStage?.label;
};

export function getRelativeTimeString(
  dateString: string,
  locale = "en",
): string {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diff = date.getTime() - today.getTime();
  const unitDiff = Math.round(diff / (1000 * 60 * 60 * 24));

  // Check if the date is more than one week old
  if (Math.abs(unitDiff) > 7) {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
    }).format(date);
  }

  // Intl.RelativeTimeFormat for dates within the last week
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return ucFirst(rtf.format(unitDiff, "day"));
}

function ucFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const isoDateStringRegex = /^\d{4}-\d{2}-\d{2}$/;

export function formatISODateString(dateString: string) {
  if (!isoDateStringRegex.test(dateString)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  // Some browsers will consider a date in the format YYYY-MM-DD as UTC, which can cause off-by-one-day issues depending on the user's timezone.
  // To avoid this, we can parse the date components manually and create a date object in the local timezone.
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return format(date, "PP");
}

/**
 * Translation key for the note logged when a deal moves to another stage.
 * Exported so the message catalogs and the tests share a single source.
 */
export const STAGE_CHANGE_NOTE_KEY = "resources.deals.stage_change_note";

type TranslateStageChange = (
  key: string,
  options: { from: string; to: string },
) => string;

/**
 * Build the text of the note logged when a deal is dragged to another stage.
 * Falls back to the raw stage value when a stage is missing from the
 * configuration, so the sentence never reads "from undefined".
 */
export function buildStageChangeNoteText(
  dealStages: DealStage[],
  fromStage: string,
  toStage: string,
  translate: TranslateStageChange,
): string {
  return translate(STAGE_CHANGE_NOTE_KEY, {
    from: findDealLabel(dealStages, fromStage) ?? fromStage,
    to: findDealLabel(dealStages, toStage) ?? toStage,
  });
}
