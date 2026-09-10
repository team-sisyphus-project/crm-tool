import type { CreateParams, DataProvider, UpdateParams } from "ra-core";
import type { ReactElement } from "react";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { buildContact, StoryWrapper } from "@/test/StoryWrapper";

import { ContactImportButton } from "./ContactImportButton";

/**
 * The file a new team arrives with: fifty people, five of whom the CRM already
 * knows. Every earlier test drives a couple of rows through a single batch, so
 * this is the first one where the run has to hold what it learned across batch
 * boundaries — which is where a duplicate silently becomes a second contact.
 */
const ROW_COUNT = 50;

/**
 * The rows whose email address already belongs to a contact in the CRM.
 * Deliberately spread through the file rather than clustered at the top: the
 * importer works in batches of ten, and duplicates that all land in the first
 * batch would never exercise the run memory the later batches depend on.
 */
const DUPLICATE_ROWS = [5, 15, 25, 35, 45];

const ROW_NUMBERS = Array.from({ length: ROW_COUNT }, (_, index) => index + 1);

const NEW_ROWS = ROW_NUMBERS.filter((row) => !DUPLICATE_ROWS.includes(row));

const emailOf = (row: number) => `person${row}@example.com`;

/** The job title the file carries — the value an update has to write. */
const titleOf = (row: number) => `Role ${row}`;

/** The title the five known contacts hold before the import runs. */
const TITLE_BEFORE_IMPORT = "Unknown";

const CSV_CONTENT = [
  "first_name,last_name,email_work,title",
  ...ROW_NUMBERS.map((row) =>
    [`Person${row}`, "Example", emailOf(row), titleOf(row)].join(","),
  ),
].join("\n");

const csvFile = () =>
  new File([CSV_CONTENT], "team-contacts.csv", { type: "text/csv" });

/**
 * The five people the CRM already holds, under the same address the file
 * carries for them. Ids run 1..5 in the order the rows appear in the file, so
 * an update can be traced back to the row that caused it.
 */
const knownContacts = () => ({
  contacts: DUPLICATE_ROWS.map((row, index) =>
    buildContact({
      id: index + 1,
      first_name: `Person${row}`,
      last_name: "Example",
      title: TITLE_BEFORE_IMPORT,
      email_jsonb: [{ email: emailOf(row), type: "Work" as const }],
    }),
  ),
});

/**
 * A backend that accepts every write and remembers it, so the test can check
 * *which* rows were written and not merely how many. Reads still go to the real
 * FakeRest backend, which is what actually has to find the five duplicates.
 */
const recordWrites = () => {
  const created: string[] = [];
  const updated: { id: unknown; title: unknown }[] = [];

  const create = async (_resource: string, params: CreateParams) => {
    const { email_jsonb: emails } = params.data as {
      email_jsonb: { email: string }[];
    };
    created.push(emails[0].email);
    return { data: { ...params.data, id: created.length } };
  };

  const update = async (_resource: string, params: UpdateParams) => {
    const { title } = params.data as { title?: unknown };
    updated.push({ id: params.id, title });
    return { data: { ...params.data, id: params.id } };
  };

  // `DataProvider["create"]` / `["update"]` are generic over the record type
  // they return; these stubs answer with whatever they were handed, which no
  // single instantiation of those signatures can express.
  return {
    created,
    updated,
    create: create as DataProvider["create"],
    update: update as DataProvider["update"],
  };
};

// The dialog renders in a portal, outside the render container, and the
// dropzone input is visually hidden: query the document for it.
const fileInput = () =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

/**
 * Opens the wizard on the file and walks it to the mapping step. Every column
 * of the file is named after the field it feeds, so the mapping needs no
 * correcting and the import is one click away.
 */
const openWizardOnFile = async (ui: ReactElement) => {
  const screen = await render(ui);
  await screen.getByRole("button", { name: "Import CSV" }).click();
  await userEvent.upload(fileInput(), csvFile());
  await screen.getByRole("button", { name: "Continue" }).click();
  await expect
    .element(screen.getByText("Choose where each column goes"))
    .toBeVisible();
  return screen;
};

/**
 * Fifty rows are five batches of real round-trips, well past the default
 * per-test budget that two-row files fit inside.
 */
const IMPORT_TIMEOUT = 60_000;
const SUMMARY_TIMEOUT = 30_000;

describe("ContactImportDialog, on a 50-row file with 5 duplicates", () => {
  it(
    "creates the 45 new people and leaves the 5 the CRM already has alone",
    async () => {
      // Arrange
      const writes = recordWrites();
      const screen = await openWizardOnFile(
        <StoryWrapper
          data={knownContacts()}
          dataProvider={{ create: writes.create, update: writes.update }}
        >
          <ContactImportButton />
        </StoryWrapper>,
      );

      // Act: the default policy leaves contacts already in the CRM untouched.
      await screen.getByRole("button", { name: "Start import" }).click();

      // Assert: the count the user reads accounts for all fifty rows, and the
      // five it did not write are exactly the five the CRM already had.
      await expect
        .element(
          screen.getByText("45 created, 0 updated, 5 skipped as duplicates."),
          { timeout: SUMMARY_TIMEOUT },
        )
        .toBeVisible();
      await expect
        .element(
          screen.getByText(
            "Contacts import complete. Imported 45 contacts, with 0 errors",
          ),
        )
        .toBeVisible();
      expect([...writes.created].sort()).toEqual(NEW_ROWS.map(emailOf).sort());
      expect(writes.updated).toEqual([]);
    },
    IMPORT_TIMEOUT,
  );

  it(
    "writes the file's values onto the 5 known contacts when asked to update them",
    async () => {
      // Arrange
      const writes = recordWrites();
      const screen = await openWizardOnFile(
        <StoryWrapper
          data={knownContacts()}
          dataProvider={{ create: writes.create, update: writes.update }}
        >
          <ContactImportButton />
        </StoryWrapper>,
      );

      // Act
      await screen
        .getByRole("radio", { name: "Update them from this file" })
        .click();
      await screen.getByRole("button", { name: "Start import" }).click();

      // Assert: the same five rows are patched rather than skipped, each onto
      // the contact it matched, carrying the title the file holds for them.
      await expect
        .element(
          screen.getByText("45 created, 5 updated, 0 skipped as duplicates."),
          { timeout: SUMMARY_TIMEOUT },
        )
        .toBeVisible();
      expect([...writes.created].sort()).toEqual(NEW_ROWS.map(emailOf).sort());
      expect(writes.updated).toEqual(
        DUPLICATE_ROWS.map((row, index) => ({
          id: index + 1,
          title: titleOf(row),
        })),
      );
    },
    IMPORT_TIMEOUT,
  );
});
