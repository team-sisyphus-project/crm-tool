import { RecordContextProvider, ResourceContextProvider } from "ra-core";
import { render } from "vitest-browser-react";
import { buildContact, StoryWrapper } from "@/test/StoryWrapper";
import { ContactBackgroundInfo } from "./ContactBackgroundInfo";

// ContactBackgroundInfo is rendered by both the desktop aside (ContactAside)
// and the mobile "details" tab (ContactShow), so covering it covers both.
const renderBackgroundInfo = (contact: ReturnType<typeof buildContact>) =>
  render(
    <StoryWrapper data={{ contacts: [contact] }}>
      <ResourceContextProvider value="contacts">
        <RecordContextProvider value={contact}>
          <ContactBackgroundInfo />
        </RecordContextProvider>
      </ResourceContextProvider>
    </StoryWrapper>,
  );

describe("ContactBackgroundInfo", () => {
  it("shows the campaign the contact is associated with", async () => {
    const screen = await renderBackgroundInfo(
      buildContact({ campaign: "Spring Outreach" }),
    );

    await expect.element(screen.getByText("Spring Outreach")).toBeVisible();
    await expect
      .poll(
        () =>
          screen.container.textContent?.includes(
            "Associated campaign: Spring Outreach",
          ) ?? false,
      )
      .toBe(true);
  });

  it("shows a placeholder when the contact has no associated campaign", async () => {
    const screen = await renderBackgroundInfo(buildContact({ campaign: null }));

    await expect
      .element(screen.getByText("No associated campaign"))
      .toBeVisible();
  });
});
