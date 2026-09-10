import { Droppable } from "@hello-pangea/dnd";
import { useTranslate } from "ra-core";

import { cn } from "@/lib/utils";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Deal } from "../types";
import {
  DEAL_COUNT_KEY,
  findDealLabel,
  formatDealAmount,
  getColumnTotal,
} from "./dealUtils";
import { DealCard } from "./DealCard";

export const DealColumn = ({
  stage,
  deals,
}: {
  stage: string;
  deals: Deal[];
}) => {
  const { dealStages, currency } = useConfigurationContext();
  const translate = useTranslate();
  const isEmpty = deals.length === 0;

  return (
    <div className="flex-1 min-w-0 flex flex-col pb-8">
      <div className="flex flex-col items-center">
        <h3 className="text-base font-medium">
          {findDealLabel(dealStages, stage) ?? stage}
        </h3>
        <p className="text-sm text-muted-foreground">
          {translate(DEAL_COUNT_KEY, { smart_count: deals.length })}
          {" · "}
          {formatDealAmount(getColumnTotal(deals), currency)}
        </p>
      </div>
      <Droppable droppableId={stage}>
        {(droppableProvided, snapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            // The border is always rendered and only changes color, so turning
            // the drop area on and off never reflows the board. flex-1 + a
            // min-height make the whole column a drop target, including a stage
            // that holds no deal at all.
            className={cn(
              "flex flex-col flex-1 gap-2 mt-2 p-2 min-h-24 rounded-2xl",
              "border border-dashed transition-colors duration-200",
              snapshot.isDraggingOver
                ? "bg-accent border-primary"
                : isEmpty
                  ? "border-border"
                  : "border-transparent",
            )}
          >
            {deals.map((deal, index) => (
              <DealCard key={deal.id} deal={deal} index={index} />
            ))}
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
