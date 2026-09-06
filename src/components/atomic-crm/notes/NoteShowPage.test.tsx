import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import { EXISTING_NOTE_TEXT } from "./NextActionReminder.stories";
import {
  NEXT_ACTION,
  WithNextAction,
  WithoutNextAction,
} from "./NoteShowPage.stories";

describe("NoteShowPage", () => {
  // The note detail route only exists on the mobile admin, which is selected
  // from the viewport width.
  beforeAll(() => {
    page.viewport(375, 667);
  });

  it("shows the stored next action and its deadline on the note it was saved on", async () => {
    const screen = await render(<WithNextAction />);

    await expect.element(screen.getByText(EXISTING_NOTE_TEXT)).toBeVisible();
    await expect.element(screen.getByText("Next action")).toBeVisible();
    await expect.element(screen.getByText(NEXT_ACTION)).toBeVisible();
    await expect.element(screen.getByText(/tomorrow at/i)).toBeVisible();
  });

  it("shows no next action line on a note that has none", async () => {
    const screen = await render(<WithoutNextAction />);

    await expect.element(screen.getByText(EXISTING_NOTE_TEXT)).toBeVisible();
    expect(screen.container.textContent).not.toContain("Next action");
  });
});
