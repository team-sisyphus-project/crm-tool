import type { ReactNode } from "react";
import { CoreAdminContext } from "ra-core";
import fakeDataProvider from "ra-data-fakerest";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";

import { testI18nProvider } from "../providers/commons/i18nProvider";
import { ActivityLogNote } from "./ActivityLogNote";

/**
 * The unit-test browser does not load the Tailwind stylesheet (the
 * `@tailwindcss/vite` plugin is only wired into `vite.config.ts`, not into
 * `vitest.config.ts`), so the clamp cannot be observed by measuring the
 * rendered height. The note body therefore reports its own collapsed/expanded
 * state through `data-state`, and the assertions below pair that state with the
 * clamp utility that actually produces the single-line rendering.
 */
const LONG_NOTE = Array.from(
  { length: 60 },
  (_, index) => `Sentence number ${index} about the ongoing negotiation.`,
).join(" ");

const Wrapper = ({ children }: { children: ReactNode }) => (
  <CoreAdminContext
    dataProvider={fakeDataProvider({})}
    i18nProvider={testI18nProvider}
  >
    {children}
  </CoreAdminContext>
);

const renderNote = () =>
  render(
    <ActivityLogNote
      header={<span className="flex-grow">Jane added a note about Acme</span>}
      text={LONG_NOTE}
      link={false}
    />,
    { wrapper: Wrapper },
  );

describe("ActivityLogNote", () => {
  it("clamps a long note to one line until the toggle is clicked", async () => {
    const screen = await renderNote();

    const excerpt = screen.getByText(LONG_NOTE);
    await expect.element(excerpt).toHaveAttribute("data-state", "collapsed");
    await expect.element(excerpt).toHaveClass("line-clamp-1");

    await screen.getByRole("button", { name: "Show full note" }).click();

    const expandedExcerpt = screen.getByText(LONG_NOTE);
    await expect
      .element(expandedExcerpt)
      .toHaveAttribute("data-state", "expanded");
    await expect.element(expandedExcerpt).not.toHaveClass("line-clamp-1");
    await expect.element(expandedExcerpt).toHaveTextContent(LONG_NOTE);
  });

  it("collapses the note again when the toggle is clicked a second time", async () => {
    const screen = await renderNote();

    await screen.getByRole("button", { name: "Show full note" }).click();
    await screen.getByRole("button", { name: "Hide full note" }).click();

    await expect
      .element(screen.getByText(LONG_NOTE))
      .toHaveAttribute("data-state", "collapsed");
  });

  it("exposes the open state on the toggle and expands from the keyboard", async () => {
    const screen = await renderNote();

    const toggle = screen.getByRole("button", { name: "Show full note" });
    await expect.element(toggle).toHaveAttribute("aria-expanded", "false");

    await userEvent.tab();
    await expect.element(toggle).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    await expect
      .element(screen.getByRole("button", { name: "Hide full note" }))
      .toHaveAttribute("aria-expanded", "true");
    await expect
      .element(screen.getByText(LONG_NOTE))
      .toHaveAttribute("data-state", "expanded");
  });

  it("renders nothing when the activity carries no note body", async () => {
    const { container } = await render(
      <ActivityLogNote
        header={<span>Jane added a note</span>}
        text=""
        link={false}
      />,
      { wrapper: Wrapper },
    );

    expect(container.firstChild).toBeNull();
  });
});
