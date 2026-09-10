import type { Deal, DealStage } from "../types";
import { getColumnTotal } from "./dealUtils";
import type { DealsByStage } from "./stages";
import { getDealsByStage, moveDealInBoard } from "./stages";

const dealStages: DealStage[] = [
  { value: "opportunity", label: "Opportunity" },
  { value: "proposal-sent", label: "Proposal Sent" },
];

const buildDeal = (overrides: Partial<Deal> & Pick<Deal, "id">): Deal => ({
  amount: 1000,
  category: "Other",
  company_id: 1,
  contact_ids: [],
  created_at: "2025-01-01T09:00:00.000Z",
  description: "",
  expected_closing_date: "2025-02-01",
  index: 0,
  name: `Deal ${overrides.id}`,
  sales_id: 1,
  stage: "opportunity",
  updated_at: "2025-01-01T09:00:00.000Z",
  ...overrides,
});

const websiteRedesign = buildDeal({
  id: 1,
  name: "Website redesign",
  stage: "opportunity",
  index: 0,
  amount: 12000,
});
const brandAudit = buildDeal({
  id: 2,
  name: "Brand audit",
  stage: "opportunity",
  index: 1,
  amount: 5000,
});
const printCampaign = buildDeal({
  id: 3,
  name: "Print campaign",
  stage: "proposal-sent",
  index: 0,
  amount: 3000,
});

const buildBoard = (): DealsByStage =>
  getDealsByStage([websiteRedesign, brandAudit, printCampaign], dealStages);

const namesIn = (deals: Deal[]) => deals.map((deal) => deal.name);

describe("moveDealInBoard", () => {
  it("puts the deal in the destination stage at the dropped position", () => {
    // Arrange
    const board = buildBoard();

    // Act: dropped on top of the deal already sitting in the destination
    const moved = moveDealInBoard(
      board,
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: 0 },
    );

    // Assert
    expect(namesIn(moved["proposal-sent"])).toEqual([
      "Website redesign",
      "Print campaign",
    ]);
  });

  it("removes the deal from the stage it came from", () => {
    const moved = moveDealInBoard(
      buildBoard(),
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: 0 },
    );

    expect(namesIn(moved["opportunity"])).toEqual(["Brand audit"]);
  });

  it("appends the deal when it is dropped after the last card of a column", () => {
    // Arrange / Act: a drop past the last card carries no index
    const moved = moveDealInBoard(
      buildBoard(),
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: undefined },
    );

    // Assert
    expect(namesIn(moved["proposal-sent"])).toEqual([
      "Print campaign",
      "Website redesign",
    ]);
  });

  it("reorders the deals when the drop stays inside the same column", () => {
    const moved = moveDealInBoard(
      buildBoard(),
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "opportunity", index: 1 },
    );

    expect(namesIn(moved["opportunity"])).toEqual([
      "Brand audit",
      "Website redesign",
    ]);
  });

  it("moves a deal into a stage that holds no deal at all", () => {
    // Arrange: an empty destination is the case a pipeline starts from
    const board: DealsByStage = getDealsByStage([websiteRedesign], dealStages);

    // Act
    const moved = moveDealInBoard(
      board,
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: undefined },
    );

    // Assert
    expect(namesIn(moved["proposal-sent"])).toEqual(["Website redesign"]);
    expect(moved["opportunity"]).toEqual([]);
  });

  it("leaves the board it was given untouched, so a failed move can be put back", () => {
    // Arrange: this board is the snapshot the caller rolls back to when the
    // move never reaches the server
    const board = buildBoard();

    // Act
    moveDealInBoard(
      board,
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: 0 },
    );

    // Assert: both the columns and the totals read from them still describe
    // the board as it was before the move
    expect(namesIn(board["opportunity"])).toEqual([
      "Website redesign",
      "Brand audit",
    ]);
    expect(namesIn(board["proposal-sent"])).toEqual(["Print campaign"]);
    expect(getColumnTotal(board["opportunity"])).toBe(17000);
    expect(getColumnTotal(board["proposal-sent"])).toBe(3000);
  });
});

describe("stage column totals after a move", () => {
  it("adds the moved amount to the destination stage total", () => {
    // Arrange
    const board = buildBoard();
    expect(getColumnTotal(board["proposal-sent"])).toBe(3000);

    // Act
    const moved = moveDealInBoard(
      board,
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: 0 },
    );

    // Assert
    expect(getColumnTotal(moved["proposal-sent"])).toBe(15000);
  });

  it("subtracts the moved amount from the stage the deal left", () => {
    const board = buildBoard();
    expect(getColumnTotal(board["opportunity"])).toBe(17000);

    const moved = moveDealInBoard(
      board,
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "proposal-sent", index: 0 },
    );

    expect(getColumnTotal(moved["opportunity"])).toBe(5000);
  });

  it("keeps a stage total unchanged when the deal is only reordered inside it", () => {
    const moved = moveDealInBoard(
      buildBoard(),
      websiteRedesign,
      { stage: "opportunity", index: 0 },
      { stage: "opportunity", index: 1 },
    );

    expect(getColumnTotal(moved["opportunity"])).toBe(17000);
  });
});
