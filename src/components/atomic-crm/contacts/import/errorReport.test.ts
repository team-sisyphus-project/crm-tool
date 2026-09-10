import { describe, expect, it } from "vitest";
import * as Papa from "papaparse";

import type { ImportRowFailure } from "./errorReport";
import {
  buildErrorReportCsv,
  ERROR_REASON_COLUMN,
  errorReportFileName,
  failureReason,
  UNKNOWN_FAILURE_REASON,
} from "./errorReport";

const failure = (
  values: Record<string, unknown>,
  reason = "Could not be saved",
  rowNumber = 2,
): ImportRowFailure => ({ rowNumber, values, reason });

/** Reads the report back the way the wizard reads an uploaded file. */
const reparse = (csv: string) =>
  Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

describe("buildErrorReportCsv", () => {
  it("returns an empty string when no row failed", () => {
    expect(buildErrorReportCsv([])).toBe("");
  });

  it("keeps the file's own columns and adds the reason column last", () => {
    // Arrange
    const failures = [failure({ first_name: "Jane", last_name: "Doe" })];

    // Act
    const csv = buildErrorReportCsv(failures);

    // Assert
    expect(csv.split("\r\n")[0]).toBe(
      `first_name,last_name,${ERROR_REASON_COLUMN}`,
    );
  });

  it("writes the reason of each row in the reason column", () => {
    // Arrange
    const failures = [
      failure({ first_name: "Jane" }, "Company is unknown"),
      failure({ first_name: "John" }, "Email is invalid", 3),
    ];

    // Act
    const { data } = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(data.map((row) => row[ERROR_REASON_COLUMN])).toEqual([
      "Company is unknown",
      "Email is invalid",
    ]);
  });

  it("quotes a value containing the delimiter", () => {
    // Arrange
    const failures = [failure({ company: "Acme, Inc." })];

    // Act
    const csv = buildErrorReportCsv(failures);

    // Assert
    expect(csv).toContain('"Acme, Inc."');
    expect(reparse(csv).data[0].company).toBe("Acme, Inc.");
  });

  it("doubles the quotes inside a quoted value", () => {
    // Arrange
    const failures = [failure({ title: 'The "boss"' })];

    // Act
    const csv = buildErrorReportCsv(failures);

    // Assert
    expect(csv).toContain('"The ""boss"""');
    expect(reparse(csv).data[0].title).toBe('The "boss"');
  });

  it("keeps a value containing a line break in one field", () => {
    // Arrange
    const failures = [failure({ background: "First line\nSecond line" })];

    // Act
    const parsed = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(parsed.data).toHaveLength(1);
    expect(parsed.data[0].background).toBe("First line\nSecond line");
  });

  it("escapes a reason that contains a delimiter or a quote", () => {
    // Arrange
    const failures = [
      failure({ first_name: "Jane" }, 'Missing "company", and no email'),
    ];

    // Act
    const parsed = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(parsed.data[0][ERROR_REASON_COLUMN]).toBe(
      'Missing "company", and no email',
    );
  });

  it("covers every column of every failed row, leaving unseen cells empty", () => {
    // Arrange
    const failures = [
      failure({ first_name: "Jane" }),
      failure({ first_name: "John", nickname: "Jack" }, "Nope", 3),
    ];

    // Act
    const parsed = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(parsed.meta.fields).toEqual([
      "first_name",
      "nickname",
      ERROR_REASON_COLUMN,
    ]);
    expect(parsed.data[0].nickname).toBe("");
  });

  it("writes non-string values as the file would carry them", () => {
    // Arrange
    const failures = [failure({ age: 42, subscribed: true, notes: null })];

    // Act
    const parsed = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(parsed.data[0]).toMatchObject({
      age: "42",
      subscribed: "true",
      notes: "",
    });
  });

  it("keeps a single reason column when the file already has one", () => {
    // Arrange
    const failures = [
      failure({ first_name: "Jane", [ERROR_REASON_COLUMN]: "stale" }, "Nope"),
    ];

    // Act
    const parsed = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(parsed.meta.fields).toEqual(["first_name", ERROR_REASON_COLUMN]);
    expect(parsed.data[0][ERROR_REASON_COLUMN]).toBe("Nope");
  });

  it("produces a report the wizard can read back as rows", () => {
    // Arrange
    const failures = [
      failure({ first_name: "Jane", company: "Acme, Inc." }, "Nope"),
      failure({ first_name: "John", company: "Globex" }, "Nope either", 3),
    ];

    // Act
    const parsed = reparse(buildErrorReportCsv(failures));

    // Assert
    expect(parsed.errors).toEqual([]);
    expect(parsed.data).toHaveLength(2);
  });
});

describe("failureReason", () => {
  it("uses the message of an Error", () => {
    expect(failureReason(new Error("Company is unknown"))).toBe(
      "Company is unknown",
    );
  });

  it("uses a thrown string as-is", () => {
    expect(failureReason("Boom")).toBe("Boom");
  });

  it("collapses a multi-line message onto one line", () => {
    expect(failureReason(new Error("Rejected:\n  bad email\n"))).toBe(
      "Rejected: bad email",
    );
  });

  it("falls back when the failure carries no message", () => {
    expect(failureReason(new Error(""))).toBe(UNKNOWN_FAILURE_REASON);
    expect(failureReason(undefined)).toBe(UNKNOWN_FAILURE_REASON);
  });
});

describe("errorReportFileName", () => {
  it("names the report after the file it came from", () => {
    expect(errorReportFileName("contacts.csv")).toBe("contacts-errors");
  });

  it("only drops the last extension", () => {
    expect(errorReportFileName("2026.contacts.csv")).toBe(
      "2026.contacts-errors",
    );
  });

  it("falls back when the file has no usable name", () => {
    expect(errorReportFileName(".csv")).toBe("contacts-errors");
  });
});
