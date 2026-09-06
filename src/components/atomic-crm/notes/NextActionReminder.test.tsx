import { render } from "vitest-browser-react";

import {
  CONTACT,
  CONTROL_NOTE,
  EMPTY_PLACEHOLDER_TEXT,
  EXISTING_NOTE_TEXT,
  InlineNoteEditWithTaskList,
  NoteCreateWithTaskList,
  SavedNoteWithTaskList,
  buildExistingNote,
  daysFromNow,
  toDateTimeInputValue,
} from "./NextActionReminder.stories";

const NEXT_ACTION = "Send the proposal";

const noteDueTomorrow = {
  contact_id: CONTACT.id,
  sales_id: 0,
  next_action: NEXT_ACTION,
  reminder_date: daysFromNow(1).toISOString(),
};

describe("next action reminder", () => {
  it("creates a reminder task in the tomorrow bucket when a note is saved with a next action due tomorrow", async () => {
    const screen = await render(<NoteCreateWithTaskList />);

    await screen.getByPlaceholder("Add a note").fill("Recap of the call");
    await screen.getByRole("button", { name: "Show options" }).click();
    await screen.getByLabelText("Next action").fill(NEXT_ACTION);
    await screen
      .getByLabelText("Deadline")
      .fill(toDateTimeInputValue(daysFromNow(1)));
    await screen.getByRole("button", { name: "Add this note" }).click();

    await expect.element(screen.getByText("Tomorrow")).toBeVisible();
    expect(screen.container.textContent).toContain(NEXT_ACTION);
  });

  it("creates no reminder task when the saved note has no next action", async () => {
    const screen = await render(<NoteCreateWithTaskList />);

    await screen.getByPlaceholder("Add a note").fill("Recap of the call");
    await screen.getByRole("button", { name: "Add this note" }).click();

    await expect.element(screen.getByText("Note added")).toBeVisible();
    await expect
      .element(screen.getByText(EMPTY_PLACEHOLDER_TEXT))
      .toBeVisible();
  });

  it("creates no second reminder when an edit leaves the next action untouched", async () => {
    const screen = await render(
      <SavedNoteWithTaskList
        note={noteDueTomorrow}
        previousNote={{ ...noteDueTomorrow }}
      />,
    );

    await screen.getByRole("button", { name: "Save note" }).click();
    // The control note goes through the same pipeline right after: once its
    // reminder is listed, a reminder for the untouched edit would be listed too.
    await screen.getByRole("button", { name: "Save control note" }).click();

    await expect.element(screen.getByText("Later")).toBeVisible();
    expect(screen.container.textContent).toContain(CONTROL_NOTE.next_action);
    expect(screen.container.textContent).not.toContain(NEXT_ACTION);
  });

  it("creates a reminder when an edit changes the next action", async () => {
    const screen = await render(
      <SavedNoteWithTaskList
        note={noteDueTomorrow}
        previousNote={{ ...noteDueTomorrow, next_action: "Send the contract" }}
      />,
    );

    await screen.getByRole("button", { name: "Save note" }).click();

    await expect.element(screen.getByText("Tomorrow")).toBeVisible();
    expect(screen.container.textContent).toContain(NEXT_ACTION);
  });

  it("creates a reminder when an existing note is edited to add a next action", async () => {
    const screen = await render(<InlineNoteEditWithTaskList />);

    await expect
      .element(screen.getByText(EMPTY_PLACEHOLDER_TEXT))
      .toBeVisible();

    await screen.getByText(EXISTING_NOTE_TEXT).hover();
    await screen.getByRole("button", { name: "Edit note" }).click();
    await screen.getByRole("button", { name: "Show options" }).click();
    await screen.getByLabelText("Next action").fill(NEXT_ACTION);
    await screen
      .getByLabelText("Deadline")
      .fill(toDateTimeInputValue(daysFromNow(1)));
    await screen.getByRole("button", { name: "Update note" }).click();

    await expect.element(screen.getByText("Tomorrow")).toBeVisible();
    expect(screen.container.textContent).toContain(NEXT_ACTION);
  });

  it("creates no second reminder when an existing note is edited without touching its next action", async () => {
    const screen = await render(
      <InlineNoteEditWithTaskList
        note={buildExistingNote({
          next_action: NEXT_ACTION,
          reminder_date: daysFromNow(1).toISOString(),
        })}
      />,
    );

    await screen.getByText(EXISTING_NOTE_TEXT).hover();
    await screen.getByRole("button", { name: "Edit note" }).click();
    await screen.getByPlaceholder("Add a note").fill("Recap, with details");
    await screen.getByRole("button", { name: "Update note" }).click();

    // The save went through — and left the task list empty.
    await expect.element(screen.getByText("Recap, with details")).toBeVisible();
    await expect
      .element(screen.getByText(EMPTY_PLACEHOLDER_TEXT))
      .toBeVisible();
  });
});
