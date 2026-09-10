import { commands } from "vitest/browser";

import { testI18nProvider } from "../providers/commons/i18nProvider";
import type { DealStage } from "../types";
import { buildStageChangeNoteText, formatISODateString } from "./dealUtils";

describe("formatISODateString", () => {
  let originalTimezone: string;

  beforeEach(() => {
    originalTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  afterEach(async () => {
    await commands.setTimezone(originalTimezone);
  });

  it("formats a valid ISO date string correctly", () => {
    const isoDate = "2024-06-15";
    const formattedDate = formatISODateString(isoDate);
    expect(formattedDate).toBe("Jun 15, 2024");
  });

  it("should not shift the date regardless of timezone", async () => {
    // Uses CDP (Emulation.setTimezoneOverride) to actually change the browser's
    // timezone at runtime so we can catch regressions where someone replaces the
    // manual date-component parse with new Date(isoString), which would shift
    // dates in negative-offset timezones like America/New_York.
    const isoDate = "2024-06-15";
    await commands.setTimezone("America/New_York");
    expect(formatISODateString(isoDate)).toBe("Jun 15, 2024");

    await commands.setTimezone("Asia/Tokyo");
    expect(formatISODateString(isoDate)).toBe("Jun 15, 2024");

    await commands.setTimezone("UTC");
    expect(formatISODateString(isoDate)).toBe("Jun 15, 2024");

    await commands.setTimezone("Pacific/Auckland");
    expect(formatISODateString(isoDate)).toBe("Jun 15, 2024");
  });

  it("throw for an invalid date string", () => {
    const invalidDate = "invalid-date";
    expect(() => formatISODateString(invalidDate)).toThrow(
      "Invalid date format. Expected YYYY-MM-DD.",
    );
  });

  it("throw for a date string with wrong format", () => {
    const invalidDate = "15-06-2024";
    expect(() => formatISODateString(invalidDate)).toThrow(
      "Invalid date format. Expected YYYY-MM-DD.",
    );
  });
});

describe("buildStageChangeNoteText", () => {
  const dealStages: DealStage[] = [
    { value: "opportunity", label: "Opportunity" },
    { value: "proposal-sent", label: "Proposal Sent" },
  ];

  // The real message catalog, so the assertions cover the sentence a user reads.
  const translate = (key: string, options: { from: string; to: string }) =>
    testI18nProvider.translate(key, options);

  it("names both stage labels in the logged sentence", () => {
    // Arrange / Act
    const text = buildStageChangeNoteText(
      dealStages,
      "opportunity",
      "proposal-sent",
      translate,
    );

    // Assert
    expect(text).toBe("Stage changed from Opportunity to Proposal Sent");
  });

  it("falls back to the raw stage value when a stage is not configured", () => {
    const text = buildStageChangeNoteText(
      dealStages,
      "opportunity",
      "delivered",
      translate,
    );

    expect(text).toBe("Stage changed from Opportunity to delivered");
  });

  it("keeps the source and destination stages in order", () => {
    const forward = buildStageChangeNoteText(
      dealStages,
      "opportunity",
      "proposal-sent",
      translate,
    );
    const backward = buildStageChangeNoteText(
      dealStages,
      "proposal-sent",
      "opportunity",
      translate,
    );

    expect(backward).not.toBe(forward);
    expect(backward).toBe("Stage changed from Proposal Sent to Opportunity");
  });
});
