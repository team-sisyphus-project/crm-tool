import type { ReactNode } from "react";
import { CoreAdminContext } from "ra-core";
import fakeDataProvider from "ra-data-fakerest";
import { render } from "vitest-browser-react";

import { testI18nProvider } from "../providers/commons/i18nProvider";
import type { Task as TData } from "../types";
import { Task } from "./Task";

const DAY = 24 * 60 * 60 * 1000;

const buildTask = (overrides: Partial<TData>): TData => ({
  id: 1,
  contact_id: 1,
  type: "none",
  text: "Call Ada back about the renewal",
  due_date: new Date().toISOString(),
  done_date: null,
  ...overrides,
});

const Wrapper = ({ children }: { children: ReactNode }) => (
  <CoreAdminContext
    dataProvider={fakeDataProvider({})}
    i18nProvider={testI18nProvider}
  >
    {children}
  </CoreAdminContext>
);

const renderTask = (task: TData) =>
  render(<Task task={task} />, { wrapper: Wrapper });

describe("Task urgency highlight", () => {
  it("flags a task whose due date has passed as overdue", async () => {
    const screen = await renderTask(
      buildTask({ due_date: new Date(Date.now() - 2 * DAY).toISOString() }),
    );

    await expect.element(screen.getByText("Overdue")).toBeVisible();
    expect(screen.getByText("Due today").elements()).toHaveLength(0);
  });

  it("flags a task due within today as due today", async () => {
    const screen = await renderTask(buildTask({}));

    await expect.element(screen.getByText("Due today")).toBeVisible();
    expect(screen.getByText("Overdue").elements()).toHaveLength(0);
  });

  it("leaves a task due later without any urgency flag", async () => {
    const screen = await renderTask(
      buildTask({ due_date: new Date(Date.now() + 7 * DAY).toISOString() }),
    );

    await expect
      .element(screen.getByText("Call Ada back about the renewal"))
      .toBeVisible();
    expect(screen.getByText("Overdue").elements()).toHaveLength(0);
    expect(screen.getByText("Due today").elements()).toHaveLength(0);
  });

  it("drops the urgency flag once an overdue task is completed", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() - 2 * DAY).toISOString(),
        done_date: new Date().toISOString(),
      }),
    );

    await expect
      .element(screen.getByText("Call Ada back about the renewal"))
      .toBeVisible();
    expect(screen.getByText("Overdue").elements()).toHaveLength(0);
    expect(screen.getByText("Due today").elements()).toHaveLength(0);
  });
});
