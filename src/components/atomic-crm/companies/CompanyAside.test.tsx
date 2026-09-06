import { RecordContextProvider, ResourceContextProvider } from "ra-core";
import { render } from "vitest-browser-react";
import { buildCompany, StoryWrapper } from "@/test/StoryWrapper";
import { ContextInfo } from "./CompanyAside";

// ContextInfo is rendered by both the desktop aside (CompanyAside) and the
// mobile detail view (CompanyShow), so covering it covers both.
const renderContextInfo = (company: ReturnType<typeof buildCompany>) =>
  render(
    <StoryWrapper data={{ companies: [company] }}>
      <ResourceContextProvider value="companies">
        <RecordContextProvider value={company}>
          <ContextInfo record={company} />
        </RecordContextProvider>
      </ResourceContextProvider>
    </StoryWrapper>,
  );

describe("CompanyAside ContextInfo", () => {
  it("shows the campaign the company is associated with", async () => {
    const screen = await renderContextInfo(
      buildCompany({ campaign: "Year-End Renewal" }),
    );

    await expect.element(screen.getByText("Year-End Renewal")).toBeVisible();
    await expect
      .poll(
        () =>
          screen.container.textContent?.includes(
            "Associated campaign: Year-End Renewal",
          ) ?? false,
      )
      .toBe(true);
  });

  it("shows a placeholder when the company has no associated campaign", async () => {
    const screen = await renderContextInfo(buildCompany({ campaign: null }));

    await expect
      .element(screen.getByText("No associated campaign"))
      .toBeVisible();
  });

  it("shows where the associated campaign stands in its lifecycle", async () => {
    const screen = await renderContextInfo(
      buildCompany({
        campaign: "Year-End Renewal",
        campaign_status: "completed",
      }),
    );

    await expect.element(screen.getByText("Year-End Renewal")).toBeVisible();
    await expect.element(screen.getByText("Completed")).toBeVisible();
  });

  it("shows the campaign without a lifecycle state when the company has no status", async () => {
    const screen = await renderContextInfo(
      buildCompany({ campaign: "Year-End Renewal", campaign_status: null }),
    );

    await expect.element(screen.getByText("Year-End Renewal")).toBeVisible();
    for (const label of ["Planning", "Active", "Completed"]) {
      await expect.element(screen.getByText(label)).not.toBeInTheDocument();
    }
  });
});
