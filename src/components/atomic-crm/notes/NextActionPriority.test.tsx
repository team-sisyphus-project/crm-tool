import { render } from "vitest-browser-react";

import {
  ACTIVITY_REGION_LABEL,
  SeededActivityLog,
  buildContactNote,
} from "../activity/NextActionInActivityLog.stories";
import {
  NoteView,
  buildNote,
  daysFromNowAtNoon,
} from "./NextActionPriority.stories";

const NEXT_ACTION = "Send the proposal";
const OVERDUE = "Overdue";
const DUE_TODAY = "Due today";
const UPCOMING = "Upcoming";
const COMPACT_TOGGLE = "Compact view";

/** The three urgency levels, seeded as three notes of one activity log. */
const notesAtEveryPriority = [
  buildContactNote({
    id: 1,
    next_action: NEXT_ACTION,
    reminder_date: daysFromNowAtNoon(-2),
  }),
  buildContactNote({
    id: 2,
    next_action: NEXT_ACTION,
    reminder_date: daysFromNowAtNoon(0),
  }),
  buildContactNote({
    id: 3,
    next_action: NEXT_ACTION,
    reminder_date: daysFromNowAtNoon(3),
  }),
];

describe("next action priority highlight", () => {
  it("flags an overdue next action in the note view", async () => {
    const screen = await render(
      <NoteView
        note={buildNote({
          next_action: NEXT_ACTION,
          reminder_date: daysFromNowAtNoon(-2),
        })}
      />,
    );

    await expect.element(screen.getByText(NEXT_ACTION)).toBeVisible();
    await expect.element(screen.getByText(OVERDUE)).toBeVisible();
    expect(screen.getByText(DUE_TODAY).elements()).toHaveLength(0);
    expect(screen.getByText(UPCOMING).elements()).toHaveLength(0);
  });

  it("flags a next action due today in the note view", async () => {
    const screen = await render(
      <NoteView
        note={buildNote({
          next_action: NEXT_ACTION,
          reminder_date: daysFromNowAtNoon(0),
        })}
      />,
    );

    await expect.element(screen.getByText(DUE_TODAY)).toBeVisible();
    expect(screen.getByText(OVERDUE).elements()).toHaveLength(0);
  });

  it("flags a next action due later in the note view", async () => {
    const screen = await render(
      <NoteView
        note={buildNote({
          next_action: NEXT_ACTION,
          reminder_date: daysFromNowAtNoon(3),
        })}
      />,
    );

    await expect.element(screen.getByText(UPCOMING)).toBeVisible();
    expect(screen.getByText(OVERDUE).elements()).toHaveLength(0);
  });

  it("shows no urgency flag when the next action has no deadline", async () => {
    const screen = await render(
      <NoteView
        note={buildNote({ next_action: NEXT_ACTION, reminder_date: null })}
      />,
    );

    await expect.element(screen.getByText(NEXT_ACTION)).toBeVisible();
    for (const label of [OVERDUE, DUE_TODAY, UPCOMING]) {
      expect(screen.getByText(label).elements()).toHaveLength(0);
    }
  });

  it("tells the three urgency levels apart in one activity log", async () => {
    const screen = await render(
      <SeededActivityLog contactNotes={notesAtEveryPriority} />,
    );
    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });

    // Three notes, three deadlines, three different things to read.
    await expect.element(activityLog.getByText(OVERDUE)).toBeVisible();
    await expect.element(activityLog.getByText(DUE_TODAY)).toBeVisible();
    await expect.element(activityLog.getByText(UPCOMING)).toBeVisible();
    for (const label of [OVERDUE, DUE_TODAY, UPCOMING]) {
      expect(activityLog.getByText(label).elements()).toHaveLength(1);
    }
  });

  it("keeps the urgency flag on a compact timeline row", async () => {
    const screen = await render(
      <SeededActivityLog contactNotes={notesAtEveryPriority} />,
    );
    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });
    await expect.element(activityLog.getByText(OVERDUE)).toBeVisible();

    await screen.getByRole("button", { name: COMPACT_TOGGLE }).click();

    // The row dropped the note body, but not the follow-up that is already late.
    await expect
      .poll(() => activityLog.getByText("Recap of the call.").elements())
      .toHaveLength(0);
    await expect.element(activityLog.getByText(OVERDUE)).toBeVisible();
    await expect.element(activityLog.getByText(UPCOMING)).toBeVisible();
  });
});
