import { format } from "date-fns";

import type { Deal, DealStage } from "../types";

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

/**
 * Translation key for the notification shown when a deal move cannot be
 * persisted and the board is rolled back. Exported so the message catalogs and
 * the tests share a single source.
 */
export const STAGE_MOVE_ERROR_KEY = "resources.deals.stage_move_error";

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

/**
 * Materializes the `number-format` design token group: compact notation,
 * narrow currency symbol and the significant-digit floor. Every deal amount is
 * rendered with these options, so a card, a column total and any future amount
 * readout stay visually consistent.
 */
export const DEAL_AMOUNT_FORMAT: Intl.NumberFormatOptions = {
  notation: "compact",
  style: "currency",
  currencyDisplay: "narrowSymbol",
  minimumSignificantDigits: 3,
};

/**
 * Translation key for the "N deals" count shown next to a column total.
 * Exported so the message catalogs and the tests share a single source.
 */
export const DEAL_COUNT_KEY = "resources.deals.nb_deals";

/**
 * Sum the amounts of the deals sitting in one stage column. A deal with a
 * missing amount counts as 0 so one incomplete record cannot turn the whole
 * column header into "NaN".
 */
export function getColumnTotal(deals: Pick<Deal, "amount">[]): number {
  return deals.reduce((sum, deal) => sum + (Number(deal.amount) || 0), 0);
}

/** Format a deal amount as a compact currency string. */
export function formatDealAmount(amount: number, currency: string): string {
  return amount.toLocaleString("en-US", { ...DEAL_AMOUNT_FORMAT, currency });
}
