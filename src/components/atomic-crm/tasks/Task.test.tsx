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

  it("flags a high-priority task that is not yet late", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() + 7 * DAY).toISOString(),
        priority: "high",
      }),
    );

    await expect.element(screen.getByText("High priority")).toBeVisible();
    expect(screen.getByText("Overdue").elements()).toHaveLength(0);
    expect(screen.getByText("Due today").elements()).toHaveLength(0);
  });

  it("shows lateness rather than importance when a high-priority task is overdue", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() - 2 * DAY).toISOString(),
        priority: "high",
      }),
    );

    await expect.element(screen.getByText("Overdue")).toBeVisible();
    expect(screen.getByText("High priority").elements()).toHaveLength(0);
  });

  it("leaves a normal-priority task due later without any flag", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() + 7 * DAY).toISOString(),
        priority: "normal",
      }),
    );

    expect(screen.getByText("High priority").elements()).toHaveLength(0);
    expect(screen.getByText("Overdue").elements()).toHaveLength(0);
    expect(screen.getByText("Due today").elements()).toHaveLength(0);
  });

  it("drops the priority flag once a high-priority task is completed", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() + 7 * DAY).toISOString(),
        priority: "high",
        done_date: new Date().toISOString(),
      }),
    );

    await expect
      .element(screen.getByText("Call Ada back about the renewal"))
      .toBeVisible();
    expect(screen.getByText("High priority").elements()).toHaveLength(0);
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

/**
 * The unit-test browser does not load the Tailwind stylesheet (the
 * `@tailwindcss/vite` plugin is only wired into `vite.config.ts`, not into
 * `vitest.config.ts`), so the accent, the surface and the tinted label cannot be
 * observed by reading computed colours. The row therefore reports which
 * emphasis treatment it is wearing through `data-emphasis`, and the assertions
 * below pair that state with the utilities that actually paint it — the same
 * pairing `ActivityLogNote.test.tsx` uses for the collapsed note body.
 */
describe("Task emphasis treatment", () => {
  const TASK_TEXT = "Call Ada back about the renewal";

  const classesOf = (element: Element | null | undefined) =>
    new Set(
      (element?.getAttribute("class") ?? "").split(/\s+/).filter(Boolean),
    );

  const rowOf = (container: Element) =>
    container.querySelector("[data-emphasis]");

  const labelBlockOf = (element: Element) => element.closest(".flex-grow");

  it("paints an overdue task with the alarm rule and surface", async () => {
    const screen = await renderTask(
      buildTask({ due_date: new Date(Date.now() - 2 * DAY).toISOString() }),
    );

    const row = rowOf(screen.container);
    const classes = classesOf(row);

    expect(row?.getAttribute("data-emphasis")).toBe("urgent");
    expect(classes.has("border-destructive")).toBe(true);
    expect(classes.has("bg-destructive/10")).toBe(true);
  });

  it("tints the action label of an urgent task", async () => {
    const screen = await renderTask(
      buildTask({ due_date: new Date(Date.now() - 2 * DAY).toISOString() }),
    );

    const labelBlock = labelBlockOf(screen.getByText(TASK_TEXT).element());

    expect(classesOf(labelBlock).has("text-destructive")).toBe(true);
  });

  it("paints a task due today with the same alarm treatment as an overdue one", async () => {
    const screen = await renderTask(buildTask({}));

    const row = rowOf(screen.container);

    expect(row?.getAttribute("data-emphasis")).toBe("urgent");
    expect(classesOf(row).has("border-destructive")).toBe(true);
  });

  it("raises a flagged task without giving it the alarm colour", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() + 7 * DAY).toISOString(),
        priority: "high",
      }),
    );

    const row = rowOf(screen.container);
    const classes = classesOf(row);

    expect(row?.getAttribute("data-emphasis")).toBe("priority");
    expect(classes.has("border-foreground")).toBe(true);
    expect(classes.has("bg-accent")).toBe(true);
    expect(classes.has("border-destructive")).toBe(false);
    expect(classes.has("bg-destructive/10")).toBe(false);
  });

  it("leaves the action label of a flagged task at the default colour", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() + 7 * DAY).toISOString(),
        priority: "high",
      }),
    );

    const labelBlock = labelBlockOf(screen.getByText(TASK_TEXT).element());

    expect(classesOf(labelBlock).has("text-destructive")).toBe(false);
  });

  it("keeps the accent slot occupied on a plain row, so an emphasized row does not shift sideways", async () => {
    const screen = await renderTask(
      buildTask({ due_date: new Date(Date.now() + 7 * DAY).toISOString() }),
    );

    const row = rowOf(screen.container);
    const classes = classesOf(row);

    expect(row?.getAttribute("data-emphasis")).toBe("none");
    expect(classes.has("border-l-2")).toBe(true);
    expect(classes.has("border-transparent")).toBe(true);
    expect(classes.has("bg-accent")).toBe(false);
    expect(classes.has("bg-destructive/10")).toBe(false);
  });

  it("lets lateness win the row treatment when a flagged task is also overdue", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() - 2 * DAY).toISOString(),
        priority: "high",
      }),
    );

    const row = rowOf(screen.container);
    const classes = classesOf(row);

    expect(row?.getAttribute("data-emphasis")).toBe("urgent");
    expect(classes.has("border-destructive")).toBe(true);
    expect(classes.has("border-foreground")).toBe(false);
    expect(classes.has("bg-accent")).toBe(false);
  });

  it("strips the treatment from a completed task and strikes its label through", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() - 2 * DAY).toISOString(),
        priority: "high",
        done_date: new Date().toISOString(),
      }),
    );

    const row = rowOf(screen.container);
    const classes = classesOf(row);
    const labelBlock = labelBlockOf(screen.getByText(TASK_TEXT).element());

    expect(row?.getAttribute("data-emphasis")).toBe("none");
    expect(classes.has("border-transparent")).toBe(true);
    expect(classes.has("bg-destructive/10")).toBe(false);
    expect(classesOf(labelBlock).has("line-through")).toBe(true);
  });

  it("writes the urgency label in the alarm colour, on a due line that stays muted", async () => {
    const screen = await renderTask(
      buildTask({ due_date: new Date(Date.now() - 2 * DAY).toISOString() }),
    );

    const label = screen.getByText("Overdue").element();

    expect(classesOf(label).has("text-destructive")).toBe(true);
    expect(classesOf(label.parentElement).has("text-muted-foreground")).toBe(
      true,
    );
  });

  it("writes the priority label in the neutral colour rather than the alarm one", async () => {
    const screen = await renderTask(
      buildTask({
        due_date: new Date(Date.now() + 7 * DAY).toISOString(),
        priority: "high",
      }),
    );

    const label = screen.getByText("High priority").element();

    expect(classesOf(label).has("text-foreground")).toBe(true);
    expect(classesOf(label).has("text-destructive")).toBe(false);
  });
});
