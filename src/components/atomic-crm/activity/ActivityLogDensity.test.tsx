import { render } from "vitest-browser-react";

import {
  ACTIVITY_REGION_LABEL,
  SeededActivityLog,
  buildContactNote,
} from "./NextActionInActivityLog.stories";

const NOTE_TEXT = "Recap of the call.";
const COMPACT_TOGGLE = "Compact view";

const renderActivityLog = () =>
  render(<SeededActivityLog contactNotes={[buildContactNote()]} />);

describe("activity log density", () => {
  it("reads the note text in full in the comfortable view", async () => {
    const screen = await renderActivityLog();
    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });

    await expect.element(activityLog.getByText(NOTE_TEXT)).toBeVisible();
    expect(activityLog.getByRole("listitem").elements()).toHaveLength(0);
  });

  it("collapses every activity into a one-line timeline row when switched to compact", async () => {
    const screen = await renderActivityLog();
    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });
    await expect.element(activityLog.getByText(NOTE_TEXT)).toBeVisible();

    await screen.getByRole("button", { name: COMPACT_TOGGLE }).click();

    // One timeline row per activity, each keeping its date...
    const rows = activityLog.getByRole("listitem");
    await expect.element(rows.first()).toBeVisible();
    await expect
      .element(activityLog.getByText(/today at/i).first())
      .toBeVisible();

    // ...and its links, while the note body is left behind.
    await expect
      .element(activityLog.getByRole("link", { name: /Ada/ }).first())
      .toBeVisible();
    await expect
      .poll(() => activityLog.getByText(NOTE_TEXT).elements())
      .toHaveLength(0);
  });

  it("restores the full activity items when switched back to comfortable", async () => {
    const screen = await renderActivityLog();
    const activityLog = screen.getByRole("region", {
      name: ACTIVITY_REGION_LABEL,
    });
    const toggle = screen.getByRole("button", { name: COMPACT_TOGGLE });
    await expect.element(activityLog.getByText(NOTE_TEXT)).toBeVisible();

    await toggle.click();
    await expect
      .poll(() => activityLog.getByRole("listitem").elements().length)
      .toBeGreaterThan(0);

    await toggle.click();

    await expect.element(activityLog.getByText(NOTE_TEXT)).toBeVisible();
    await expect
      .poll(() => activityLog.getByRole("listitem").elements())
      .toHaveLength(0);
  });
});
