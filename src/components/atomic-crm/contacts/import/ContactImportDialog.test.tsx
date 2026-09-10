import { userEvent } from "@vitest/browser/context";
import { render } from "vitest-browser-react";

import { ImportWizard } from "./ContactImportDialog.stories";

const CSV_CONTENT = [
  "first_name,last_name,email_work",
  "Ada,Lovelace,ada@example.com",
  "Grace,Hopper,grace@example.com",
].join("\n");

const csvFile = () =>
  new File([CSV_CONTENT], "my-contacts.csv", { type: "text/csv" });

const openWizard = async () => {
  const screen = await render(<ImportWizard />);
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
});
