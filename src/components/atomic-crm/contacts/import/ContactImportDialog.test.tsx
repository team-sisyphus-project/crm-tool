import { userEvent } from "@vitest/browser/context";
import type {
  CreateParams,
  DataProvider,
  RaRecord,
  UpdateParams,
} from "ra-core";
import type { ReactElement } from "react";
import { render } from "vitest-browser-react";

import { buildContact, StoryWrapper } from "@/test/StoryWrapper";

import { ContactImportButton } from "./ContactImportButton";
import { ImportWizard } from "./ContactImportDialog.stories";

const CSV_CONTENT = [
  "first_name,last_name,email_work",
  "Ada,Lovelace,ada@example.com",
  "Grace,Hopper,grace@example.com",
].join("\n");

// Same two contacts, written by a tool that names its columns differently:
// "Given name" and "Surname" cannot be auto-matched, "Loyalty points" has no
// contact field at all.
const MIS_HEADERED_CSV = [
  "Given name,Surname,E-Mail Work,Loyalty points",
  "Ada,Lovelace,ada@example.com,320",
  "Grace,Hopper,grace@example.com,45",
].join("\n");

const csvFile = () =>
  new File([CSV_CONTENT], "my-contacts.csv", { type: "text/csv" });

const misHeaderedCsvFile = () =>
  new File([MIS_HEADERED_CSV], "export.csv", { type: "text/csv" });

/** Records what the app asks the backend to write, per resource. */
const createRecorder = () => {
  const created: Record<string, RaRecord[]> = {};
  const updated: Record<string, RaRecord[]> = {};
  let nextId = 1;
  const create = async (resource: string, params: CreateParams) => {
    const record = { ...params.data, id: nextId++ };
    created[resource] = [...(created[resource] ?? []), record];
    return { data: record };
  };
  const update = async (resource: string, params: UpdateParams) => {
    const record = { ...params.data, id: params.id };
    updated[resource] = [...(updated[resource] ?? []), record];
    return { data: record };
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

/** A backend that refuses to create the contact with the given first name. */
const refusingCreate =
  (refusedFirstName: string): DataProvider["create"] =>
  async (_resource: string, params: CreateParams) => {
    const { first_name: firstName } = params.data as { first_name?: string };
    if (firstName === refusedFirstName) {
      throw new Error(`${refusedFirstName} is not welcome`);
    }
    return { data: { ...params.data, id: 1 } } as never;
  };

const openWizard = async (ui: ReactElement = <ImportWizard />) => {
  const screen = await render(ui);
  await screen.getByRole("button", { name: "Import CSV" }).click();
  await expect
    .element(screen.getByRole("heading", { name: "Import contacts" }))
    .toBeVisible();
  return screen;
};

// The dialog renders in a portal, outside the render container, and the
// dropzone input is visually hidden: query the document for it.
const fileInput = () =>
  document.querySelector('input[type="file"]') as HTMLInputElement;

const selectCsvFile = async (file: File) => {
  await userEvent.upload(fileInput(), file);
};

/** Walks from the upload step to the mapping step for the given file. */
const goToMappingStep = async (
  screen: Awaited<ReturnType<typeof openWizard>>,
  file: File,
) => {
  await selectCsvFile(file);
  await screen.getByRole("button", { name: "Continue" }).click();
  await expect
    .element(screen.getByText("Choose where each column goes"))
    .toBeVisible();
};

const columnSelect = (
  screen: Awaited<ReturnType<typeof openWizard>>,
  header: string,
) =>
  screen.getByRole("combobox", {
    name: `Import the ${header} column as`,
  });

const mapColumnTo = async (
  screen: Awaited<ReturnType<typeof openWizard>>,
  header: string,
  fieldLabel: string,
) => {
  await columnSelect(screen, header).click();
  await screen
    .getByRole("listbox")
    .getByText(fieldLabel, { exact: true })
    .click();
};

/**
 * A backend that accepts writes but only lets them land when the test says so,
 * which is what keeps the running step on screen long enough to assert on it.
 */
const heldCreate = () => {
  let release!: () => void;
  const landed = new Promise<void>((resolve) => {
    release = resolve;
  });
  const create = async (_resource: string, params: CreateParams) => {
    await landed;
    return { data: { ...params.data, id: 1 } };
  };
  return { create: create as DataProvider["create"], release };
};

/** The CRM already knows Ada, under the address the file carries for her. */
const knownContact = () => ({
  contacts: [
    buildContact({
      id: 1,
      first_name: "Ada",
      last_name: "Lovelace",
      title: "CTO",
      email_jsonb: [{ email: "Ada@Example.com", type: "Work" as const }],
    }),
  ],
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContactImportDialog", () => {
  it("starts on the upload step with a CSV template to download", async () => {
    const screen = await openWizard();

    await expect
      .element(screen.getByRole("link", { name: "Download CSV sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByText("Upload", { exact: true }))
      .toHaveAttribute("aria-current", "step");
  });

  it("shows the columns and first rows of the selected file", async () => {
    const screen = await openWizard();

    await selectCsvFile(csvFile());

    await expect
      .element(screen.getByText("Preview of my-contacts.csv"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("columnheader", { name: "first_name" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("columnheader", { name: "email_work" }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "Ada", exact: true }))
      .toBeVisible();
    await expect
      .element(screen.getByRole("cell", { name: "grace@example.com" }))
      .toBeVisible();
    await expect
      .element(
        screen.getByText("Showing the first 2 rows, 3 columns detected."),
      )
      .toBeVisible();
  });

  it("marks the preview step as current once a file is selected", async () => {
    const screen = await openWizard();

    await selectCsvFile(csvFile());

    await expect
      .element(screen.getByText("Preview", { exact: true }))
      .toHaveAttribute("aria-current", "step");
  });

  it("goes back to the upload step from the preview", async () => {
    const screen = await openWizard();
    await selectCsvFile(csvFile());

    await screen.getByRole("button", { name: "Back" }).click();

    await expect
      .element(screen.getByRole("link", { name: "Download CSV sample" }))
      .toBeVisible();
    await expect
      .element(screen.getByText("Preview of my-contacts.csv"))
      .not.toBeInTheDocument();
  });

  it("does not offer to start the import before a file is selected", async () => {
    const screen = await openWizard();

    await expect
      .element(screen.getByRole("button", { name: "Start import" }))
      .not.toBeInTheDocument();
  });

  it("reports a file it cannot read instead of moving on", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const screen = await openWizard();

    await selectCsvFile(new File([""], "empty.csv", { type: "text/csv" }));

    await expect
      .element(
        screen.getByText(
          "Could not read this file. Please make sure it is a valid CSV file with a header row.",
        ),
      )
      .toBeVisible();
  });

  it("continues from the preview to the column mapping", async () => {
    const screen = await openWizard();
    await selectCsvFile(csvFile());

    await screen.getByRole("button", { name: "Continue" }).click();

    await expect
      .element(screen.getByText("Columns", { exact: true }))
      .toHaveAttribute("aria-current", "step");
    await expect
      .element(
        screen.getByRole("columnheader", { name: "Column in your file" }),
      )
      .toBeVisible();
  });

  it("pre-selects the field matching each recognised header", async () => {
    const screen = await openWizard();

    await goToMappingStep(screen, csvFile());

    await expect
      .element(columnSelect(screen, "first_name"))
      .toHaveTextContent("First name");
    await expect
      .element(columnSelect(screen, "email_work"))
      .toHaveTextContent("Work email");
  });

  it("matches headers whose case and separators differ from the field name", async () => {
    const screen = await openWizard();

    await goToMappingStep(screen, misHeaderedCsvFile());

    await expect
      .element(columnSelect(screen, "E-Mail Work"))
      .toHaveTextContent("Work email");
  });

  it("leaves a column it cannot recognise out of the import", async () => {
    const screen = await openWizard();

    await goToMappingStep(screen, misHeaderedCsvFile());

    await expect
      .element(columnSelect(screen, "Loyalty points"))
      .toHaveTextContent("Do not import");
  });

  it("shows the first value of each column as a hint", async () => {
    const screen = await openWizard();

    await goToMappingStep(screen, misHeaderedCsvFile());

    await expect
      .element(screen.getByRole("cell", { name: "Ada", exact: true }))
      .toBeVisible();
  });

  it("blocks the import while a required field has no column", async () => {
    const screen = await openWizard();

    await goToMappingStep(screen, misHeaderedCsvFile());

    await expect
      .element(
        screen.getByText(
          "No column feeds First name, Last name yet. Pick a column for it to start the import.",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Start import" }))
      .toBeDisabled();
  });

  it("unblocks the import once every required field is mapped", async () => {
    const screen = await openWizard();
    await goToMappingStep(screen, misHeaderedCsvFile());

    await mapColumnTo(screen, "Given name", "First name (required)");
    await mapColumnTo(screen, "Surname", "Last name (required)");

    await expect
      .element(screen.getByRole("button", { name: "Start import" }))
      .toBeEnabled();
  });

  it("blocks the import again when a required column is set to be ignored", async () => {
    const screen = await openWizard();
    await goToMappingStep(screen, csvFile());

    await mapColumnTo(screen, "last_name", "Do not import");

    await expect
      .element(screen.getByRole("button", { name: "Start import" }))
      .toBeDisabled();
  });

  it("goes back to the preview from the column mapping", async () => {
    const screen = await openWizard();
    await goToMappingStep(screen, csvFile());

    await screen.getByRole("button", { name: "Back" }).click();

    await expect
      .element(screen.getByText("Preview of my-contacts.csv"))
      .toBeVisible();
  });

  it("imports a mis-headered file with the fields the user remapped", async () => {
    const recorder = createRecorder();
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: recorder.create }}>
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, misHeaderedCsvFile());
    await mapColumnTo(screen, "Given name", "First name (required)");
    await mapColumnTo(screen, "Surname", "Last name (required)");

    await screen.getByRole("button", { name: "Start import" }).click();

    await expect
      .element(
        screen.getByText(
          "Contacts import complete. Imported 2 contacts, with 0 errors",
        ),
      )
      .toBeVisible();
    expect(
      recorder.created.contacts?.map(
        ({ first_name, last_name, email_jsonb }) => ({
          first_name,
          last_name,
          email_jsonb,
        }),
      ),
    ).toEqual([
      {
        first_name: "Ada",
        last_name: "Lovelace",
        email_jsonb: [{ email: "ada@example.com", type: "Work" }],
      },
      {
        first_name: "Grace",
        last_name: "Hopper",
        email_jsonb: [{ email: "grace@example.com", type: "Work" }],
      },
    ]);
  });

  it("does not import the columns left out of the mapping", async () => {
    const recorder = createRecorder();
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: recorder.create }}>
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, misHeaderedCsvFile());
    await mapColumnTo(screen, "Given name", "First name (required)");
    await mapColumnTo(screen, "Surname", "Last name (required)");

    await screen.getByRole("button", { name: "Start import" }).click();

    await expect
      .element(
        screen.getByText(
          "Contacts import complete. Imported 2 contacts, with 0 errors",
        ),
      )
      .toBeVisible();
    expect(
      recorder.created.contacts?.every(
        (contact) => !("Loyalty points" in contact),
      ),
    ).toBe(true);
  });

  it("offers to leave contacts already in the CRM alone, by default", async () => {
    const screen = await openWizard();

    await goToMappingStep(screen, csvFile());

    await expect
      .element(screen.getByRole("radio", { name: "Leave them untouched" }))
      .toBeChecked();
    await expect
      .element(
        screen.getByRole("radio", { name: "Update them from this file" }),
      )
      .not.toBeChecked();
  });

  it("does not import a row whose email is already in the CRM", async () => {
    const recorder = createRecorder();
    const screen = await openWizard(
      <StoryWrapper
        data={knownContact()}
        dataProvider={{ create: recorder.create, update: recorder.update }}
      >
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, csvFile());

    await screen.getByRole("button", { name: "Start import" }).click();

    await expect
      .element(
        screen.getByText("1 created, 0 updated, 1 skipped as duplicates."),
      )
      .toBeVisible();
    expect(
      recorder.created.contacts?.map(({ first_name }) => first_name),
    ).toEqual(["Grace"]);
    expect(recorder.updated.contacts).toBeUndefined();
  });

  it("updates the contact already in the CRM when asked to", async () => {
    const recorder = createRecorder();
    const screen = await openWizard(
      <StoryWrapper
        data={knownContact()}
        dataProvider={{ create: recorder.create, update: recorder.update }}
      >
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, csvFile());

    await screen
      .getByRole("radio", { name: "Update them from this file" })
      .click();
    await screen.getByRole("button", { name: "Start import" }).click();

    await expect
      .element(
        screen.getByText("1 created, 1 updated, 0 skipped as duplicates."),
      )
      .toBeVisible();
    expect(recorder.updated.contacts).toEqual([
      { id: 1, first_name: "Ada", last_name: "Lovelace" },
    ]);
    expect(
      recorder.created.contacts?.map(({ first_name }) => first_name),
    ).toEqual(["Grace"]);
  });

  it("reports the row the CRM refused, with a report to download", async () => {
    // Arrange: the backend accepts Ada (line 2) but not Grace (line 3).
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: refusingCreate("Grace") }}>
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, csvFile());

    // Act
    await screen.getByRole("button", { name: "Start import" }).click();

    // Assert
    await expect
      .element(
        screen.getByText(
          "Contacts import complete. Imported 1 contacts, with 1 errors",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByText("Row 3: Grace is not welcome"))
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("button", { name: "Download the rows that failed" }),
      )
      .toBeVisible();
  });

  it("offers no error report when every row went through", async () => {
    const recorder = createRecorder();
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: recorder.create }}>
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, csvFile());

    await screen.getByRole("button", { name: "Start import" }).click();

    await expect
      .element(
        screen.getByText(
          "Contacts import complete. Imported 2 contacts, with 0 errors",
        ),
      )
      .toBeVisible();
    await expect
      .element(
        screen.getByRole("button", { name: "Download the rows that failed" }),
      )
      .not.toBeInTheDocument();
  });
  // The journey a real user makes, in one test: pick a file, look at it, say
  // where its columns go, watch it run, read what happened. Each step is left
  // through the control the user would actually use, and the indicator is
  // checked on the way so a step cannot silently be skipped.
  it("walks a file from the upload step to the summary", async () => {
    const recorder = createRecorder();
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: recorder.create }}>
        <ContactImportButton />
      </StoryWrapper>,
    );

    // Upload
    await expect
      .element(screen.getByText("Upload", { exact: true }))
      .toHaveAttribute("aria-current", "step");
    await selectCsvFile(csvFile());

    // Preview
    await expect
      .element(screen.getByText("Preview", { exact: true }))
      .toHaveAttribute("aria-current", "step");
    await expect
      .element(screen.getByText("Preview of my-contacts.csv"))
      .toBeVisible();
    await screen.getByRole("button", { name: "Continue" }).click();

    // Column mapping
    await expect
      .element(screen.getByText("Columns", { exact: true }))
      .toHaveAttribute("aria-current", "step");
    await expect
      .element(screen.getByText("Choose where each column goes"))
      .toBeVisible();
    await screen.getByRole("button", { name: "Start import" }).click();

    // Summary
    await expect
      .element(
        screen.getByText(
          "Contacts import complete. Imported 2 contacts, with 0 errors",
        ),
      )
      .toBeVisible();
    await expect
      .element(screen.getByText("Import", { exact: true }))
      .toHaveAttribute("aria-current", "step");
    expect(
      recorder.created.contacts?.map(({ first_name }) => first_name),
    ).toEqual(["Ada", "Grace"]);

    // The dialog's own corner cross is also named "Close": the first one in the
    // document is the footer action, which is the one the user is offered here.
    await screen.getByRole("button", { name: "Close" }).first().click();
    await expect
      .element(screen.getByRole("heading", { name: "Import contacts" }))
      .not.toBeInTheDocument();
  });

  it("moves focus to the step that just appeared", async () => {
    const screen = await openWizard();
    await selectCsvFile(csvFile());

    await screen.getByRole("button", { name: "Continue" }).click();

    await expect
      .element(screen.getByText("Choose where each column goes"))
      .toBeVisible();
    const focused = document.activeElement;
    expect(focused?.textContent).toContain("Choose where each column goes");
    // The step body itself, not the dialog as a whole: the wizard's title sits
    // outside it, so finding it here would mean focus fell back to the shell.
    expect(focused?.textContent).not.toContain("Import contacts");
  });

  it("offers a way to stop from the moment the import starts", async () => {
    const backend = heldCreate();
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: backend.create }}>
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, csvFile());

    await screen.getByRole("button", { name: "Start import" }).click();

    // Nothing has been written yet, so there is no estimate to show — the way
    // out is offered all the same.
    await expect
      .element(screen.getByRole("button", { name: "Stop import" }))
      .toBeVisible();
    await expect
      .element(screen.getByText(/Imported 0 of 2 contacts/))
      .toHaveAttribute("aria-live", "polite");

    backend.release();
    await expect
      .element(
        screen.getByText(
          "Contacts import complete. Imported 2 contacts, with 0 errors",
        ),
      )
      .toBeVisible();
  });

  it("goes back to the column mapping when the import is stopped", async () => {
    const backend = heldCreate();
    const screen = await openWizard(
      <StoryWrapper dataProvider={{ create: backend.create }}>
        <ContactImportButton />
      </StoryWrapper>,
    );
    await goToMappingStep(screen, csvFile());
    await screen.getByRole("button", { name: "Start import" }).click();

    await screen.getByRole("button", { name: "Stop import" }).click();
    backend.release();

    await expect
      .element(screen.getByText("Choose where each column goes"))
      .toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: "Start import" }))
      .toBeEnabled();
  });
});
