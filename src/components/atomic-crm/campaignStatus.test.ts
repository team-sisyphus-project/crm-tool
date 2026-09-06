import tablesSql from "../../../supabase/schemas/01_tables.sql?raw";
import viewsSql from "../../../supabase/schemas/03_views.sql?raw";
import { CAMPAIGN_STATUSES, parseCampaignStatus } from "./campaignStatus";

// Isolate a single `create table` / `create view` statement, so an assertion
// about one relation cannot be satisfied by another one in the same file.
const statementFor = (sql: string, header: string): string => {
  const start = sql.indexOf(header);
  expect(start, `"${header}" not found`).toBeGreaterThan(-1);
  return sql.slice(start, sql.indexOf(";", start));
};

describe("parseCampaignStatus", () => {
  it.each(CAMPAIGN_STATUSES)("keeps the known status %s", (status) => {
    expect(parseCampaignStatus(status)).toBe(status);
  });

  it("normalizes casing and surrounding whitespace", () => {
    // Arrange
    const cell = "  Active ";

    // Act
    const status = parseCampaignStatus(cell);

    // Assert
    expect(status).toBe("active");
  });

  it("returns null for a status outside the known list", () => {
    expect(parseCampaignStatus("archived")).toBeNull();
  });

  it.each([
    { label: "an empty cell", value: "" },
    { label: "null", value: null },
    { label: "undefined", value: undefined },
  ])("returns null for $label", ({ value }) => {
    expect(parseCampaignStatus(value)).toBeNull();
  });
});

// The frontend reads both entities through their summary view but writes to the
// base table, so a column present on only one side is silently unusable. These
// assertions cover the half of that contract TypeScript cannot check.
describe("campaign_status schema wiring", () => {
  it.each([
    ["contacts", "create table public.contacts ("],
    ["companies", "create table public.companies ("],
  ])("declares campaign_status on the %s table, for writes", (_, header) => {
    expect(statementFor(tablesSql, header)).toContain("campaign_status text");
  });

  it.each([
    [
      "contacts_summary",
      "create or replace view public.contacts_summary",
      "co",
    ],
    [
      "companies_summary",
      "create or replace view public.companies_summary",
      "c",
    ],
  ])("exposes campaign_status through %s, for reads", (_, header, alias) => {
    expect(statementFor(viewsSql, header)).toContain(
      `${alias}.campaign_status`,
    );
  });

  it.each([
    ["contacts", "create table public.contacts ("],
    ["companies", "create table public.companies ("],
  ])("constrains the %s status to the values the app knows", (_, header) => {
    // Arrange
    const expected = CAMPAIGN_STATUSES.map((status) => `'${status}'`).join(
      ", ",
    );

    // Assert: the database rejects anything the CampaignStatus union excludes.
    expect(statementFor(tablesSql, header)).toContain(
      `check (campaign_status in (${expected}))`,
    );
  });
});
