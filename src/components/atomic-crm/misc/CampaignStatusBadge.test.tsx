import { I18nContext } from "ra-core";
import { render } from "vitest-browser-react";

import { testI18nProvider } from "../providers/commons/i18nProvider";
import { CampaignStatusBadge } from "./CampaignStatusBadge";

const renderBadge = (status?: string | null) =>
  render(
    <I18nContext.Provider value={testI18nProvider}>
      <CampaignStatusBadge status={status} />
    </I18nContext.Provider>,
  );

describe("CampaignStatusBadge", () => {
  it("labels a campaign that is still being planned", async () => {
    const screen = await renderBadge("planning");

    await expect.element(screen.getByText("Planning")).toBeVisible();
  });

  it("labels a campaign that is running", async () => {
    const screen = await renderBadge("active");

    await expect.element(screen.getByText("Active")).toBeVisible();
  });

  it("labels a campaign that is over", async () => {
    const screen = await renderBadge("completed");

    await expect.element(screen.getByText("Completed")).toBeVisible();
  });

  it("renders nothing when the record has no campaign status", async () => {
    const screen = await renderBadge(null);

    await expect.poll(() => screen.container.textContent).toBe("");
  });

  it("renders nothing for a status the application does not know", async () => {
    const screen = await renderBadge("archived");

    await expect.poll(() => screen.container.textContent).toBe("");
  });
});
