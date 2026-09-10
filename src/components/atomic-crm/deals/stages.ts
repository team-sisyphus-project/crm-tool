import type { ConfigurationContextValue } from "../root/ConfigurationContext";
import type { Deal } from "../types";

export type DealsByStage = Record<Deal["stage"], Deal[]>;

export const getDealsByStage = (
  unorderedDeals: Deal[],
  dealStages: ConfigurationContextValue["dealStages"],
) => {
  if (!dealStages) return {};
  const dealsByStage: Record<Deal["stage"], Deal[]> = unorderedDeals.reduce(
    (acc, deal) => {
      // if deal has a stage that does not exist in configuration, assign it to the first stage
      const stage = dealStages.find((s) => s.value === deal.stage)
        ? deal.stage
        : dealStages[0].value;
      acc[stage].push(deal);
      return acc;
    },
    dealStages.reduce(
      (obj, stage) => ({ ...obj, [stage.value]: [] }),
      {} as Record<Deal["stage"], Deal[]>,
    ),
  );
  // order each column by index
  dealStages.forEach((stage) => {
    dealsByStage[stage.value] = dealsByStage[stage.value].sort(
      (recordA: Deal, recordB: Deal) => recordA.index - recordB.index,
    );
  });
  return dealsByStage;
};

/** A place on the board: a stage column, and an index inside that column. */
type BoardPosition = {
  stage: string;
  /** undefined when the deal is dropped after the last card of the column */
  index?: number;
};

const withoutIndex = (column: Deal[], index: number) =>
  column.filter((_, position) => position !== index);

// A drop past the last card carries no index, so the deal is appended.
const withDealAt = (column: Deal[], deal: Deal, at: number | undefined) => [
  ...column.slice(0, at ?? column.length),
  deal,
  ...column.slice(at ?? column.length),
];

/**
 * Move one deal from a board position to another and return a NEW board.
 *
 * Neither the given board nor any of its columns are mutated, so the caller
 * keeps the pre-move board intact and can put it back when the move fails to
 * persist — instead of leaving the columns, and the amount totals computed
 * from them, showing a move that never reached the server.
 */
export const moveDealInBoard = (
  board: DealsByStage,
  deal: Deal,
  from: { stage: string; index: number },
  to: BoardPosition,
): DealsByStage => {
  if (from.stage === to.stage) {
    return {
      ...board,
      [to.stage]: withDealAt(
        withoutIndex(board[from.stage], from.index),
        deal,
        to.index,
      ),
    };
  }
  return {
    ...board,
    [from.stage]: withoutIndex(board[from.stage], from.index),
    [to.stage]: withDealAt(board[to.stage], deal, to.index),
  };
};
