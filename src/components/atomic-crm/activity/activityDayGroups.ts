import { format, isToday, isYesterday } from "date-fns";

/**
 * The timeline hides everything but the most recent day behind a folded
 * header, so the events have to be bucketed per calendar day before they can
 * be rendered. Grouping is pure and lives here so it can be reasoned about (and
 * tested) without a browser.
 */

export type DatedRecord = { date: string };

export type ActivityDayGroup<T extends DatedRecord> = {
  /** Stable identity of the calendar day, in the reader's own timezone. */
  key: string;
  /** Date of the first event of the day, used to label the group. */
  date: string;
  items: T[];
};

/** Relative day names the reader recognises without reading a date. */
export type RelativeDayName = "today" | "yesterday";

const parse = (date: string) => {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Calendar day of an event, in local time — two events belong to the same
 * group when a reader would call them "the same day", not when they share a
 * UTC date.
 */
export const toDayKey = (date: string): string => {
  const parsed = parse(date);
  // An unparseable date gets its own bucket rather than silently joining
  // another day's events.
  return parsed ? format(parsed, "yyyy-MM-dd") : `invalid:${date}`;
};

/**
 * Buckets events into calendar days, preserving the order they arrive in. The
 * list is already sorted date DESC, so the first group is the most recent day.
 */
export const groupActivitiesByDay = <T extends DatedRecord>(
  items: T[],
): ActivityDayGroup<T>[] => {
  const groups = new Map<string, ActivityDayGroup<T>>();

  for (const item of items) {
    const key = toDayKey(item.date);
    const group = groups.get(key);

    if (group) {
      group.items.push(item);
    } else {
      groups.set(key, { key, date: item.date, items: [item] });
    }
  }

  return Array.from(groups.values());
};

/**
 * "Today" and "Yesterday" are named; every older day is read as a date.
 * Returns null when the day needs a formatted date instead of a name.
 */
export const getRelativeDayName = (date: string): RelativeDayName | null => {
  const parsed = parse(date);

  if (!parsed) return null;
  if (isToday(parsed)) return "today";
  if (isYesterday(parsed)) return "yesterday";

  return null;
};

/** Localized day header for a group older than yesterday. */
export const formatDayGroupDate = (date: string, locale = "en"): string => {
  const parsed = parse(date);

  if (!parsed) return date;

  // The year only appears once it stops being obvious, so recent headers stay
  // short and an old one is never ambiguous.
  const isCurrentYear = parsed.getFullYear() === new Date().getFullYear();

  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(isCurrentYear ? {} : { year: "numeric" }),
  }).format(parsed);
};
