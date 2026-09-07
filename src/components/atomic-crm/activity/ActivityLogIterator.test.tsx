import type { ReactNode } from "react";
import {
  CoreAdminContext,
  InfinitePaginationContext,
  ListContextProvider,
  useList,
  type InfinitePaginationContextValue,
} from "ra-core";
import fakeDataProvider from "ra-data-fakerest";
import { render } from "vitest-browser-react";

import { COMPANY_CREATED } from "../consts";
import { testI18nProvider } from "../providers/commons/i18nProvider";
import type { ActivityCompanyCreated, Company } from "../types";
import { ActivityLogIterator } from "./ActivityLogIterator";

/**
 * The day fold is designed at the group level and tested there
 * (`ActivityLogDayGroup.test.tsx`). What is only decidable here is the wiring:
 * the timeline has to open the most recent day and no other, so the panel's
 * height follows recent activity instead of all of it. These tests drive the
 * iterator with a real list context and read what a person would see.
 */

const atLocalTime = (daysAgo: number, hours: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const companyCreated = (
  id: number,
  name: string,
  date: string,
): ActivityCompanyCreated => ({
  id,
  type: COMPANY_CREATED,
  company_id: id,
  company: { id, name } as Company,
  sales_id: 1,
  date,
});

/** Two events today, one yesterday, in the date-DESC order the list supplies. */
const ACTIVITIES = [
  companyCreated(1, "Acme", atLocalTime(0, 10)),
  companyCreated(2, "Globex", atLocalTime(0, 9)),
  companyCreated(3, "Initech", atLocalTime(1, 15)),
];

/** No further page to load: the fold, not the pagination, is under test here. */
const IDLE_PAGINATION = {
  fetchNextPage: () => Promise.resolve(),
  fetchPreviousPage: () => Promise.resolve(),
  hasNextPage: false,
  hasPreviousPage: false,
  isFetchingNextPage: false,
  isFetchingPreviousPage: false,
} as unknown as InfinitePaginationContextValue;

const Wrapper = ({ children }: { children: ReactNode }) => (
  <CoreAdminContext
    dataProvider={fakeDataProvider({
      sales: [{ id: 1, first_name: "Jane", last_name: "Doe" }],
      companies: [],
    })}
    i18nProvider={testI18nProvider}
  >
    {children}
  </CoreAdminContext>
);

const Timeline = ({ activities }: { activities: ActivityCompanyCreated[] }) => {
  const listContext = useList({ data: activities, resource: "activity_log" });

  return (
    <ListContextProvider value={listContext}>
      <InfinitePaginationContext.Provider value={IDLE_PAGINATION}>
        <ActivityLogIterator />
      </InfinitePaginationContext.Provider>
    </ListContextProvider>
  );
};

const renderTimeline = (activities = ACTIVITIES) =>
  render(<Timeline activities={activities} />, { wrapper: Wrapper });

describe("ActivityLogIterator", () => {
  it("shows the events of the most recent day without any interaction", async () => {
    const screen = await renderTimeline();

    await expect.element(screen.getByText("Acme")).toBeVisible();
    await expect.element(screen.getByText("Globex")).toBeVisible();
  });

  it("folds every day older than the most recent one", async () => {
    const screen = await renderTimeline();

    expect(
      screen.getByText("Initech").elements(),
      "yesterday's events stay out of the panel until they are asked for",
    ).toHaveLength(0);
  });

  it("says how much a folded day is hiding before it is opened", async () => {
    const screen = await renderTimeline();

    await expect
      .element(
        screen
          .getByText("Yesterday", { exact: true })
          .element()
          .closest("button")!,
      )
      .toHaveTextContent("1 entry");
  });

  it("reveals a folded day when its header is clicked, without closing the recent one", async () => {
    const screen = await renderTimeline();

    await screen.getByText("Yesterday", { exact: true }).click();

    await expect.element(screen.getByText("Initech")).toBeVisible();
    await expect.element(screen.getByText("Acme")).toBeVisible();
  });

  it("opens exactly one day, whatever the timeline's depth", async () => {
    const screen = await renderTimeline([
      ...ACTIVITIES,
      companyCreated(4, "Hooli", atLocalTime(2, 11)),
      companyCreated(5, "Umbrella", atLocalTime(3, 11)),
    ]);

    const headers = screen.getByRole("button").elements();
    const expanded = headers.filter(
      (header) => header.getAttribute("aria-expanded") === "true",
    );

    expect(headers).toHaveLength(4);
    expect(expanded).toHaveLength(1);
    await expect.element(expanded[0]).toHaveTextContent("Today");
  });

  it("gathers a day's events under one header that counts them", async () => {
    const screen = await renderTimeline();

    expect(
      screen.getByText("Today", { exact: true }).elements(),
      "the two events of today share a single header",
    ).toHaveLength(1);
    await expect
      .element(
        screen.getByText("Today", { exact: true }).element().closest("button")!,
      )
      .toHaveTextContent("2 entries");
  });
});
