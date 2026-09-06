import { describe, expect, it } from "vitest";

import type { Contact, ContactNote, Deal, DealNote } from "../../../types";
import { generateContactNotes } from "./contactNotes";
import { generateDealNotes } from "./dealNotes";
import type { Db } from "./types";

const REFERENCE_DATE = "2024-01-01T00:00:00.000Z";

const buildContact = (id: number): Contact => ({
  id,
  first_name: `First ${id}`,
  last_name: `Last ${id}`,
  title: "Head of Sales",
  company_id: id,
  email_jsonb: [],
  first_seen: REFERENCE_DATE,
  last_seen: REFERENCE_DATE,
  has_newsletter: false,
  tags: [],
  gender: "male",
  sales_id: 0,
  status: "warm",
  background: "",
  phone_jsonb: [],
});

const buildDeal = (id: number): Deal => ({
  id,
  name: `Deal ${id}`,
  company_id: id,
  contact_ids: [id],
  category: "Other",
  stage: "opportunity",
  description: "",
  amount: 1000,
  created_at: REFERENCE_DATE,
  updated_at: REFERENCE_DATE,
  expected_closing_date: REFERENCE_DATE,
  sales_id: 0,
  index: 0,
});

const buildDb = (): Db =>
  ({
    contacts: Array.from(Array(10).keys()).map(buildContact),
    deals: Array.from(Array(10).keys()).map(buildDeal),
  }) as Db;

const isIsoDate = (value: string) => !Number.isNaN(Date.parse(value));

const expectCoherentNextActionPair = (note: ContactNote | DealNote) => {
  if (note.next_action == null) {
    expect(note.reminder_date).toBeNull();
    return;
  }

  expect(note.next_action.length).toBeGreaterThan(0);
  expect(typeof note.reminder_date).toBe("string");
  expect(isIsoDate(note.reminder_date as string)).toBe(true);
  expect(Date.parse(note.reminder_date as string)).toBeGreaterThan(
    Date.parse(note.date),
  );
};

describe("note fake data generators", () => {
  it("gives every generated contact note a coherent next-action pair", () => {
    // Arrange
    const db = buildDb();

    // Act
    const notes = generateContactNotes(db);

    // Assert
    expect(notes.length).toBeGreaterThan(0);
    notes.forEach(expectCoherentNextActionPair);
  });

  it("gives every generated deal note a coherent next-action pair", () => {
    // Arrange
    const db = buildDb();

    // Act
    const notes = generateDealNotes(db);

    // Assert
    expect(notes.length).toBeGreaterThan(0);
    notes.forEach(expectCoherentNextActionPair);
  });

  it("leaves some contact notes without any next action", () => {
    const notes = generateContactNotes(buildDb());

    expect(notes.some((note) => note.next_action != null)).toBe(true);
    expect(notes.some((note) => note.next_action == null)).toBe(true);
  });

  it("leaves some deal notes without any next action", () => {
    const notes = generateDealNotes(buildDb());

    expect(notes.some((note) => note.next_action != null)).toBe(true);
    expect(notes.some((note) => note.next_action == null)).toBe(true);
  });
});
