import { render } from "vitest-browser-react";
import { page } from "vitest/browser";

import {
  CompanyEditBasic,
  CompanyEditWithCampaign,
} from "./CompanyEdit.stories";

/**
 * `<CompanyEdit>` renders its inputs before the record has been fetched, so
 * anything typed earlier is wiped when the record finally populates the form.
 * Waiting on a field the fixture fills is what makes the interaction reliable.
 */
const waitForLoadedForm = async (
  screen: Awaited<ReturnType<typeof render>>,
): Promise<void> => {
  await expect
    .element(screen.getByLabelText("Company name *"))
    .toHaveValue("Analytical Engines");
};

describe("CompanyEdit", () => {
  beforeAll(() => {
    page.viewport(1600, 900);
  });

  it("loads the stored campaign and its status into the form", async () => {
    const screen = await render(<CompanyEditWithCampaign silent />);

    await expect
      .element(screen.getByLabelText("Associated campaign"))
      .toHaveValue("Year-End Renewal");
    await expect
      .element(screen.getByRole("combobox", { name: "Campaign status" }))
      .toHaveTextContent("Planning");
  });

  it("submits the campaign and the status entered in the form", async () => {
    // Arrange
    const updateMock = vi.fn().mockResolvedValue({ data: { id: 1 } });
    const screen = await render(
      <CompanyEditBasic silent dataProvider={{ update: updateMock }} />,
    );
    await waitForLoadedForm(screen);

    // Act
    await screen.getByLabelText("Associated campaign").fill("Fall Expansion");
    const statusInput = screen.getByRole("combobox", {
      name: "Campaign status",
    });
    await statusInput.click();
    await screen.getByRole("listbox").getByText("Active").click();
    await screen.getByRole("button", { name: /^save$/i }).click();
    await expect
      .poll(() => screen.getByText("Element updated"))
      .toBeInTheDocument();
    // The mutation is undoable: closing the notification is what commits it.
    await screen.getByLabelText("Close toast").click();

    // Assert
    await expect.poll(() => updateMock.mock.calls.length).toBe(1);
    expect(updateMock).toBeCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: expect.objectContaining({
          campaign: "Fall Expansion",
          campaign_status: "active",
        }),
      }),
    );
  });

  it("shows the campaign on the detail card once the company is saved", async () => {
    // Arrange: no update override, so the value round-trips through the data
    // provider and comes back on the detail card the form redirects to.
    const screen = await render(<CompanyEditBasic silent />);
    await waitForLoadedForm(screen);

    // Act
    await screen.getByLabelText("Associated campaign").fill("Fall Expansion");
    const statusInput = screen.getByRole("combobox", {
      name: "Campaign status",
    });
    await statusInput.click();
    await screen.getByRole("listbox").getByText("Active").click();
    await screen.getByRole("button", { name: /^save$/i }).click();
    await expect
      .poll(() => screen.getByText("Element updated"))
      .toBeInTheDocument();
    await screen.getByLabelText("Close toast").click();

    // Assert: the edit form gave way to the detail card, which now carries the
    // campaign and the badge stating where it stands.
    await expect
      .element(screen.getByRole("button", { name: /^save$/i }))
      .not.toBeInTheDocument();
    await expect
      .poll(
        () =>
          screen.container.textContent?.includes(
            "Associated campaign: Fall Expansion",
          ) ?? false,
      )
      .toBe(true);
    await expect.element(screen.getByText("Active")).toBeVisible();
  });
});
