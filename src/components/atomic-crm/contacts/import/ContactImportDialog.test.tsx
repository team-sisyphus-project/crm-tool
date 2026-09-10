import { userEvent } from "@vitest/browser/context";
import type { CreateParams, DataProvider, RaRecord } from "ra-core";
import type { ReactElement } from "react";
import { render } from "vitest-browser-react";

import { StoryWrapper } from "@/test/StoryWrapper";

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

/** Records what the app asks the backend to create, per resource. */
const createRecorder = () => {
  const created: Record<string, RaRecord[]> = {};
  let nextId = 1;
  const create = async (resource: string, params: CreateParams) => {
    const record = { ...params.data, id: nextId++ };
    created[resource] = [...(created[resource] ?? []), record];
    return { data: record };
  };
  // `DataProvider["create"]` is generic over the record type it returns; this
  // stub answers with whatever it was handed, which no single instantiation of
  // that signature can express.
  return { created, create: create as DataProvider["create"] };
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
});
