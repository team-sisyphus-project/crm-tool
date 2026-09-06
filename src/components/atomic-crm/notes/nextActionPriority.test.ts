import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endOfToday } from "date-fns/endOfToday";
import { startOfToday } from "date-fns/startOfToday";

import { getNextActionPriority } from "./nextActionPriority";

const WEDNESDAY = new Date("2026-02-25T12:00:00Z");

const hoursFromNow = (hours: number) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

describe("getNextActionPriority", () => {
  beforeEach(() => {
    vi.setSystemTime(WEDNESDAY);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns overdue for a reminder date before today", () => {
    expect(getNextActionPriority(hoursFromNow(-24))).toBe("overdue");
  });

  it("returns today for a reminder date later in the current day", () => {
    expect(getNextActionPriority(hoursFromNow(1))).toBe("today");
  });

  it("returns today for a reminder date earlier in the current day", () => {
    expect(getNextActionPriority(hoursFromNow(-1))).toBe("today");
  });

  it("returns upcoming for a reminder date after today", () => {
    expect(getNextActionPriority(hoursFromNow(24))).toBe("upcoming");
  });

  it("returns upcoming for a reminder date weeks away", () => {
    expect(getNextActionPriority(hoursFromNow(30 * 24))).toBe("upcoming");
  });

  it("returns none when the note carries no reminder date", () => {
    expect(getNextActionPriority(null)).toBe("none");
    expect(getNextActionPriority(undefined)).toBe("none");
    expect(getNextActionPriority("")).toBe("none");
  });

  it("returns none for an unparseable reminder date", () => {
    expect(getNextActionPriority("not a date")).toBe("none");
  });

  describe("day boundaries", () => {
    it("treats the very start of today as due today, not overdue", () => {
      expect(getNextActionPriority(startOfToday().toISOString())).toBe("today");
    });

    it("treats the last millisecond of today as due today", () => {
      const justBeforeMidnight = new Date(
        endOfToday().getTime() - 1,
      ).toISOString();
      expect(getNextActionPriority(justBeforeMidnight)).toBe("today");
    });

    it("treats the millisecond before today as overdue", () => {
      const justBeforeToday = new Date(
        startOfToday().getTime() - 1,
      ).toISOString();
      expect(getNextActionPriority(justBeforeToday)).toBe("overdue");
    });

    it("treats the end of today as upcoming", () => {
      expect(getNextActionPriority(endOfToday().toISOString())).toBe(
        "upcoming",
      );
    });
  });
});
