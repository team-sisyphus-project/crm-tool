import { ResourceContextProvider, ShowBase } from "ra-core";
import { render } from "vitest-browser-react";

import { buildContact, StoryWrapper } from "@/test/StoryWrapper";

import { CompanyAside } from "../companies/CompanyAside";
import { ContactAside } from "../contacts/ContactAside";
import { ContactShow } from "../contacts/ContactShow";
import type { Company } from "../types";
import { CampaignStatusBadge } from "./CampaignStatusBadge";

const mockIsMobile = vi.hoisted(() => vi.fn(() => false));
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockIsMobile,
}));

const buildCompany = (overrides: Partial<Company> = {}): Company =>
  ({
    id: 1,
    name: "Acme",
    sector: "energy",
    size: 10,
    created_at: "2025-01-01T09:00:00.000Z",
    sales_id: 0,
    nb_contacts: 0,
    nb_deals: 0,
    ...overrides,
  }) as Company;

const backgroundOf = (element: Element) =>
  getComputedStyle(element).backgroundColor;

describe("CampaignStatusBadge", () => {
  beforeEach(() => {
    mockIsMobile.mockReturnValue(false);
  });

  it.each([
    ["planning", "Planning"],
    ["active", "Active"],
    ["completed", "Completed"],
  ])("renders the configured label for the %s state", async (value, label) => {
    const screen = await render(
      <StoryWrapper>
        <CampaignStatusBadge value={value} />
      </StoryWrapper>,
    );

    await expect.element(screen.getByText(label)).toBeVisible();
  });

  it("paints each state with a distinct color", async () => {
    const screen = await render(
      <StoryWrapper>
        <CampaignStatusBadge value="planning" />
        <CampaignStatusBadge value="active" />
        <CampaignStatusBadge value="completed" />
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Planning")).toBeVisible();

    const colors = ["Planning", "Active", "Completed"].map((label) =>
      backgroundOf(screen.getByText(label).element()),
    );

    expect(new Set(colors).size).toBe(3);
    colors.forEach((color) => expect(color).not.toBe(""));
  });

  it("renders a muted placeholder when the status is not set", async () => {
    const screen = await render(
      <StoryWrapper>
        <CampaignStatusBadge value={null} />
      </StoryWrapper>,
    );

    const placeholder = screen.getByText("Not set");
    await expect.element(placeholder).toBeVisible();
    expect(placeholder.element().className).toContain("text-muted-foreground");
  });

  it("falls back to the placeholder for a value outside the vocabulary", async () => {
    const screen = await render(
      <StoryWrapper>
        <CampaignStatusBadge value="archived" />
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Not set")).toBeVisible();
  });

  // The aside is `hidden sm:block`, so it is in the document but not painted at
  // the test viewport width. Presence is what these two assert.
  it("shows the campaign status on the contact detail aside", async () => {
    const contact = buildContact({ campaign_status: "active" });

    const screen = await render(
      <StoryWrapper data={{ contacts: [contact] }}>
        <ResourceContextProvider value="contacts">
          <ShowBase id={contact.id}>
            <ContactAside />
          </ShowBase>
        </ResourceContextProvider>
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows the campaign status on the company detail aside", async () => {
    const company = buildCompany({ campaign_status: "completed" });

    const screen = await render(
      <StoryWrapper data={{ companies: [company] }}>
        <ResourceContextProvider value="companies">
          <ShowBase id={company.id}>
            <CompanyAside />
          </ShowBase>
        </ResourceContextProvider>
      </StoryWrapper>,
    );

    await expect.element(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("shows the campaign status in the mobile contact details tab", async () => {
    mockIsMobile.mockReturnValue(true);
    const contact = buildContact({ campaign_status: "planning" });

    const screen = await render(
      <StoryWrapper data={{ contacts: [contact] }}>
        <ContactShow resource="contacts" id={contact.id} />
      </StoryWrapper>,
    );

    await screen.getByRole("tab", { name: "Details" }).click();

    await expect.element(screen.getByText("Planning")).toBeVisible();
  });
});
