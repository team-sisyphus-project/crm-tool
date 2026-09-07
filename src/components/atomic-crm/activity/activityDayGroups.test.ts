import {
  formatDayGroupDate,
  getRelativeDayName,
  groupActivitiesByDay,
  toDayKey,
} from "./activityDayGroups";

const atLocalTime = (daysAgo: number, hours: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

describe("groupActivitiesByDay", () => {
  it("buckets events that happened on the same calendar day together", () => {
    const morning = { date: atLocalTime(0, 9) };
    const evening = { date: atLocalTime(0, 22) };
    const yesterday = { date: atLocalTime(1, 12) };

    const groups = groupActivitiesByDay([evening, morning, yesterday]);

    expect(groups).toHaveLength(2);
    expect(groups[0].items).toEqual([evening, morning]);
    expect(groups[1].items).toEqual([yesterday]);
  });

  it("keeps the incoming order, so the most recent day comes first", () => {
    const groups = groupActivitiesByDay([
      { date: atLocalTime(0, 10) },
      { date: atLocalTime(3, 10) },
      { date: atLocalTime(9, 10) },
    ]);

    expect(groups.map((group) => group.key)).toEqual([
      toDayKey(atLocalTime(0, 10)),
      toDayKey(atLocalTime(3, 10)),
      toDayKey(atLocalTime(9, 10)),
    ]);
  });

  it("labels each group with the date of its first event", () => {
    const first = { date: atLocalTime(2, 18) };
    const second = { date: atLocalTime(2, 8) };

    const [group] = groupActivitiesByDay([first, second]);

    expect(group.date).toBe(first.date);
  });

  it("returns an empty list when there is no activity", () => {
    expect(groupActivitiesByDay([])).toEqual([]);
  });

  it("gives an unparseable date its own bucket instead of merging it", () => {
    const groups = groupActivitiesByDay([
      { date: atLocalTime(0, 10) },
      { date: "not-a-date" },
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[1].items).toEqual([{ date: "not-a-date" }]);
  });
});

describe("getRelativeDayName", () => {
  it("names today and yesterday", () => {
    expect(getRelativeDayName(atLocalTime(0, 11))).toBe("today");
    expect(getRelativeDayName(atLocalTime(1, 11))).toBe("yesterday");
  });

  it("leaves older days unnamed, so they are read as a date", () => {
    expect(getRelativeDayName(atLocalTime(2, 11))).toBeNull();
    expect(getRelativeDayName(atLocalTime(40, 11))).toBeNull();
  });

  it("leaves an unparseable date unnamed", () => {
    expect(getRelativeDayName("not-a-date")).toBeNull();
  });
});

describe("formatDayGroupDate", () => {
  it("spells out the weekday and the day of the month", () => {
    expect(formatDayGroupDate("2026-03-05T10:00:00.000Z", "en")).toContain(
      "March",
    );
  });

  it("falls back to the raw value when the date cannot be read", () => {
    expect(formatDayGroupDate("not-a-date", "en")).toBe("not-a-date");
  });
});
