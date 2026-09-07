import type { ReactNode } from "react";
import { CoreAdminContext } from "ra-core";
import fakeDataProvider from "ra-data-fakerest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testI18nProvider } from "../providers/commons/i18nProvider";
import { ActivityLogDayGroup } from "./ActivityLogDayGroup";

const atLocalTime = (daysAgo: number, hours: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const Wrapper = ({ children }: { children: ReactNode }) => (
  <CoreAdminContext
    dataProvider={fakeDataProvider({})}
    i18nProvider={testI18nProvider}
  >
    {children}
  </CoreAdminContext>
);

const renderGroup = ({
  date,
  defaultOpen,
}: {
  date: string;
  defaultOpen?: boolean;
}) =>
  render(
    <ActivityLogDayGroup date={date} count={2} defaultOpen={defaultOpen}>
      <p>Jane added a note about Acme</p>
      <p>John added company Globex</p>
    </ActivityLogDayGroup>,
    { wrapper: Wrapper },
  );

describe("ActivityLogDayGroup", () => {
  it("hides the events of an older day until the header is clicked", async () => {
    const screen = await renderGroup({ date: atLocalTime(3, 10) });

    expect(
      screen.container.textContent,
      "an older day starts folded",
    ).not.toContain("Jane added a note about Acme");

    await screen.getByRole("button").click();

    await expect
      .element(screen.getByText("Jane added a note about Acme"))
      .toBeVisible();
  });

  it("shows the events of the most recent day without any interaction", async () => {
    const screen = await renderGroup({
      date: atLocalTime(0, 10),
      defaultOpen: true,
    });

    await expect
      .element(screen.getByText("John added company Globex"))
      .toBeVisible();
  });

  it("folds an open group again when the header is clicked", async () => {
    const screen = await renderGroup({
      date: atLocalTime(0, 10),
      defaultOpen: true,
    });

    await screen.getByRole("button").click();

    expect(screen.container.textContent).not.toContain(
      "John added company Globex",
    );
  });

  it("says how many events a folded day is hiding", async () => {
    const screen = await renderGroup({ date: atLocalTime(4, 10) });

    await expect
      .element(screen.getByRole("button"))
      .toHaveTextContent("2 entries");
  });

  it("names today rather than showing its date", async () => {
    const screen = await renderGroup({
      date: atLocalTime(0, 10),
      defaultOpen: true,
    });

    await expect.element(screen.getByRole("button")).toHaveTextContent("Today");
  });

  it("names yesterday rather than showing its date", async () => {
    const screen = await renderGroup({ date: atLocalTime(1, 10) });

    await expect
      .element(screen.getByRole("button"))
      .toHaveTextContent("Yesterday");
  });

  it("shows the date itself for a day older than yesterday", async () => {
    const screen = await renderGroup({ date: "2026-03-05T10:00:00.000Z" });

    await expect.element(screen.getByRole("button")).toHaveTextContent("March");
  });

  it("exposes the folded state and opens from the keyboard", async () => {
    const screen = await renderGroup({ date: atLocalTime(2, 10) });

    const header = screen.getByRole("button");
    await expect.element(header).toHaveAttribute("aria-expanded", "false");

    await userEvent.tab();
    await expect.element(header).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await expect.element(header).toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByText("Jane added a note about Acme"))
      .toBeVisible();
  });
});
