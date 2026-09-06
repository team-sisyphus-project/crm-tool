import { render } from "vitest-browser-react";

import {
  daysFromNow,
  toDateTimeInputValue,
} from "../notes/NextActionReminder.stories";
import {
  ACTIVITY_REGION_LABEL,
  NoteToActivityLog,
  REVEAL_ACTIVITY_LABEL,
  SeededActivityLog,
  buildContactNote,
  buildDealNote,
} from "./NextActionInActivityLog.stories";

const NEXT_ACTION = "Send the proposal";

describe("next action in the activity log", () => {
  it("shows the next action and its deadline on the activity item, and creates the matching reminder task", async () => {
    const screen = await render(<NoteToActivityLog />);

    await screen.getByPlaceholder("Add a note").fill("Recap of the call");
    await screen.getByRole("button", { name: "Show options" }).click();
    await screen.getByLabelText("Next action").fill(NEXT_ACTION);
    await screen
      .getByLabelText("Deadline")
      .fill(toDateTimeInputValue(daysFromNow(1)));
    await screen.getByRole("button", { name: "Add this note" }).click();

    // The reminder lands in the task list...
    await expect.element(screen.getByText("Tomorrow")).toBeVisible();

    // ...and the same commitment is readable on the activity item.
    await screen.getByRole("button", { name: REVEAL_ACTIVITY_LABEL }).click();

    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });
    await expect.element(activityLog.getByText("Next action")).toBeVisible();
    await expect.element(activityLog.getByText(NEXT_ACTION)).toBeVisible();
    await expect.element(activityLog.getByText(/tomorrow at/i)).toBeVisible();
  });

  it("shows the next action of a deal note on its activity item", async () => {
    const screen = await render(
      <SeededActivityLog
        dealNotes={[
          buildDealNote({
            next_action: NEXT_ACTION,
            reminder_date: daysFromNow(1).toISOString(),
          }),
        ]}
      />,
    );

    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });
    await expect.element(activityLog.getByText("Next action")).toBeVisible();
    await expect.element(activityLog.getByText(NEXT_ACTION)).toBeVisible();
    await expect.element(activityLog.getByText(/tomorrow at/i)).toBeVisible();
  });

  it("shows no next action line on an activity item whose note has none", async () => {
    const screen = await render(
      <SeededActivityLog contactNotes={[buildContactNote()]} />,
    );

    await expect.element(screen.getByText("Recap of the call.")).toBeVisible();
    expect(screen.container.textContent).not.toContain("Next action");
  });
});
