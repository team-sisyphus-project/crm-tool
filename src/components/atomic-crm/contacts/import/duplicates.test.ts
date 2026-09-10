import { describe, expect, it } from "vitest";

import type { Contact } from "../../types";
import type { ContactImportSchema } from "../useContactImport";
import type { DuplicatePolicy } from "./duplicates";
import {
  buildContactPatch,
  contactEmails,
  decideBatch,
  DEFAULT_DUPLICATE_POLICY,
  emailEntries,
  isEmptyPatch,
  matchContactByEmail,
  normalizeEmail,
  phoneEntries,
  rowEmails,
} from "./duplicates";

/**
 * A CSV row as the mapping step produces it: only the columns the user mapped
 * are present, so the absent ones are genuinely missing keys.
 */
const row = (values: Partial<ContactImportSchema>): ContactImportSchema =>
  values as ContactImportSchema;

const contact = (values: Partial<Contact>): Contact =>
  ({
    id: 1,
    first_name: "Jane",
    last_name: "Roe",
    title: "Analyst",
    email_jsonb: [{ email: "jane@acme.example", type: "Work" }],
    phone_jsonb: [],
    tags: [],
    first_seen: "2020-01-01T00:00:00.000Z",
    last_seen: "2020-01-01T00:00:00.000Z",
    has_newsletter: false,
    gender: "female",
    status: "warm",
    background: "Met at a conference",
    sales_id: 7,
    ...values,
  }) as Contact;

const NO_MATCHES = new Map<string, Contact>();
const NOTHING_CLAIMED = new Set<string>();

describe("normalizeEmail", () => {
  it("lower-cases and trims the address", () => {
    expect(normalizeEmail("  Jane@Acme.Example ")).toBe("jane@acme.example");
  });

  it("returns null when there is nothing to compare", () => {
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
  });
});

describe("rowEmails", () => {
  it("collects every address the row carries, in comparison form", () => {
    expect(
      rowEmails(
        row({
          email_work: "Jane@Acme.Example",
          email_home: "jane@home.example",
        }),
      ),
    ).toEqual(["jane@acme.example", "jane@home.example"]);
  });

  it("reports the same address once, whatever its case", () => {
    expect(
      rowEmails(
        row({
          email_work: "Jane@Acme.Example",
          email_other: "jane@acme.example",
        }),
      ),
    ).toEqual(["jane@acme.example"]);
  });

  it("returns nothing for a row without an email column", () => {
    expect(rowEmails(row({ first_name: "Jane" }))).toEqual([]);
  });
});

describe("contactEmails", () => {
  it("reads the addresses of an existing contact in comparison form", () => {
    expect(
      contactEmails(
        contact({
          email_jsonb: [
            { email: "Jane@Acme.Example", type: "Work" },
            { email: "jane@home.example", type: "Home" },
          ],
        }),
      ),
    ).toEqual(["jane@acme.example", "jane@home.example"]);
  });

  it("copes with a contact that has no emails at all", () => {
    expect(contactEmails(contact({ email_jsonb: [] }))).toEqual([]);
    expect(contactEmails(null)).toEqual([]);
  });
});

describe("matchContactByEmail", () => {
  it("matches on the whole address, whatever its case", () => {
    const jane = contact({
      id: 3,
      email_jsonb: [{ email: "Jane@Acme.Example", type: "Work" }],
    });

    expect(matchContactByEmail([jane], "jane@acme.example")).toBe(jane);
  });

  it("rejects a candidate that merely contains the address", () => {
    const notJane = contact({
      id: 4,
      email_jsonb: [{ email: "notjane@acme.example", type: "Work" }],
    });

    expect(matchContactByEmail([notJane], "jane@acme.example")).toBeNull();
  });
});

describe("decideBatch", () => {
  const jane = contact({ id: 9 });
  const existing = new Map<string, Contact>([["jane@acme.example", jane]]);

  it("creates a row that matches nothing", () => {
    const decisions = decideBatch(
      [row({ email_work: "sam@acme.example" })],
      existing,
      NOTHING_CLAIMED,
      "update",
    );

    expect(decisions).toEqual([
      { action: "create", emails: ["sam@acme.example"] },
    ]);
  });

  it("creates a row that carries no email, since nothing identifies it", () => {
    const decisions = decideBatch(
      [row({ first_name: "Sam" })],
      existing,
      NOTHING_CLAIMED,
      "skip",
    );

    expect(decisions).toEqual([{ action: "create", emails: [] }]);
  });

  it("skips a matching row under the skip policy", () => {
    const decisions = decideBatch(
      [row({ email_work: "JANE@acme.example" })],
      existing,
      NOTHING_CLAIMED,
      "skip",
    );

    expect(decisions).toEqual([
      { action: "skip", emails: ["jane@acme.example"] },
    ]);
  });

  it("updates the matched contact under the update policy", () => {
    const decisions = decideBatch(
      [row({ email_home: "Jane@Acme.Example" })],
      existing,
      NOTHING_CLAIMED,
      "update",
    );

    expect(decisions).toEqual([
      { action: "update", emails: ["jane@acme.example"], contact: jane },
    ]);
  });

  it.each<DuplicatePolicy>(["skip", "update"])(
    "acts on the first line carrying an address and skips the later ones (%s policy)",
    (policy) => {
      const decisions = decideBatch(
        [
          row({ email_work: "sam@acme.example", first_name: "Sam" }),
          row({ email_work: "SAM@acme.example", first_name: "Samuel" }),
        ],
        NO_MATCHES,
        NOTHING_CLAIMED,
        policy,
      );

      expect(decisions.map((decision) => decision.action)).toEqual([
        "create",
        "skip",
      ]);
    },
  );

  it("acts once on a contact two rows reach through different addresses", () => {
    const janeBothAddresses = contact({
      id: 9,
      email_jsonb: [
        { email: "jane@acme.example", type: "Work" },
        { email: "jane@home.example", type: "Home" },
      ],
    });
    const decisions = decideBatch(
      [
        row({ email_work: "jane@acme.example", title: "Head of Analytics" }),
        row({ email_home: "jane@home.example", title: "Analyst" }),
      ],
      new Map([
        ["jane@acme.example", janeBothAddresses],
        ["jane@home.example", janeBothAddresses],
      ]),
      NOTHING_CLAIMED,
      "update",
    );

    expect(decisions.map((decision) => decision.action)).toEqual([
      "update",
      "skip",
    ]);
  });

  it("skips a row whose address an earlier batch already handled", () => {
    const decisions = decideBatch(
      [row({ email_work: "Sam@acme.example" })],
      NO_MATCHES,
      new Set(["sam@acme.example"]),
      "update",
    );

    expect(decisions).toEqual([
      { action: "skip", emails: ["sam@acme.example"] },
    ]);
  });

  it("leaves the given claim set and match table untouched", () => {
    const claimed = new Set<string>();

    decideBatch(
      [row({ email_work: "sam@acme.example" })],
      existing,
      claimed,
      "update",
    );

    expect(claimed.size).toBe(0);
    expect(existing.size).toBe(1);
  });

  it("defaults to leaving existing contacts alone", () => {
    expect(DEFAULT_DUPLICATE_POLICY).toBe("skip");
  });
});

describe("emailEntries / phoneEntries", () => {
  it("keeps the address as written, with its type", () => {
    expect(
      emailEntries(
        row({
          email_work: "Jane@Acme.Example",
          email_home: "",
          email_other: "  ",
        }),
      ),
    ).toEqual([{ email: "Jane@Acme.Example", type: "Work" }]);
  });

  it("keeps the numbers the row carries", () => {
    expect(phoneEntries(row({ phone_home: "0102030405" }))).toEqual([
      { number: "0102030405", type: "Home" },
    ]);
  });
});

describe("buildContactPatch", () => {
  const jane = contact({
    id: 9,
    title: "Analyst",
    tags: [1],
    phone_jsonb: [{ number: "0102030405", type: "Work" }],
  });

  it("writes only the values the row carries", () => {
    const patch = buildContactPatch(
      row({
        email_work: "jane@acme.example",
        first_name: "Jane",
        last_name: "Roe",
        title: "Head of Analytics",
      }),
      jane,
      { tagIds: [] },
    );

    expect(patch).toEqual({
      first_name: "Jane",
      last_name: "Roe",
      title: "Head of Analytics",
    });
  });

  it("never blanks a field the file left out or left empty", () => {
    const patch = buildContactPatch(
      row({ email_work: "jane@acme.example", title: "   " }),
      jane,
      { tagIds: [] },
    );

    expect(patch).not.toHaveProperty("title");
    expect(patch).not.toHaveProperty("background");
    expect(patch).not.toHaveProperty("status");
  });

  it("never reassigns the contact's owner", () => {
    const patch = buildContactPatch(
      row({ first_name: "Jane", email_work: "jane@acme.example" }),
      jane,
      { tagIds: [] },
    );

    expect(patch).not.toHaveProperty("sales_id");
    expect(patch).not.toHaveProperty("id");
  });

  it("adds a new address to the ones the contact already has", () => {
    const patch = buildContactPatch(
      row({ email_work: "jane@acme.example", email_home: "jane@home.example" }),
      jane,
      { tagIds: [] },
    );

    expect(patch.email_jsonb).toEqual([
      { email: "jane@acme.example", type: "Work" },
      { email: "jane@home.example", type: "Home" },
    ]);
  });

  it("does not add an address the contact already has in another case", () => {
    const patch = buildContactPatch(
      row({ email_work: "JANE@ACME.EXAMPLE" }),
      jane,
      { tagIds: [] },
    );

    expect(patch).not.toHaveProperty("email_jsonb");
  });

  it("adds new phone numbers and tags without dropping the current ones", () => {
    const patch = buildContactPatch(
      row({ email_work: "jane@acme.example", phone_home: "0605040302" }),
      jane,
      { tagIds: [2] },
    );

    expect(patch.phone_jsonb).toEqual([
      { number: "0102030405", type: "Work" },
      { number: "0605040302", type: "Home" },
    ]);
    expect(patch.tags).toEqual([1, 2]);
  });

  it("reads the dates the row carries as ISO timestamps", () => {
    const patch = buildContactPatch(
      row({ email_work: "jane@acme.example", last_seen: "2024-03-02" }),
      jane,
      { tagIds: [] },
    );

    expect(patch.last_seen).toBe("2024-03-02T00:00:00.000Z");
    expect(patch).not.toHaveProperty("first_seen");
  });

  it("moves the contact to the company the row names", () => {
    const patch = buildContactPatch(
      row({ email_work: "jane@acme.example", company: "Acme" }),
      jane,
      { companyId: 12, tagIds: [] },
    );

    expect(patch.company_id).toBe(12);
  });

  it("writes nothing when the row adds nothing", () => {
    const patch = buildContactPatch(
      row({ email_work: "jane@acme.example" }),
      jane,
      { tagIds: [] },
    );

    expect(isEmptyPatch(patch)).toBe(true);
  });
});
