import { InfiniteListBase } from "ra-core";
import type { Identifier } from "ra-core";
import { useState } from "react";

import { ActivityLogContext } from "./ActivityLogContext";
import {
  ActivityLogDensityContext,
  type ActivityLogDensity,
} from "./ActivityLogDensityContext";
import { ActivityLogDensityToggle } from "./ActivityLogDensityToggle";
import { ActivityLogIterator } from "./ActivityLogIterator";

type ActivityLogProps = {
  companyId?: Identifier;
  pageSize?: number;
  context?: "company" | "contact" | "deal" | "all";
};

export function ActivityLog({
  companyId,
  pageSize = 20,
  context = "all",
}: ActivityLogProps) {
  const [density, setDensity] = useState<ActivityLogDensity>("comfortable");

  return (
    <ActivityLogContext.Provider value={context}>
      <ActivityLogDensityContext.Provider value={density}>
        <div className="flex flex-col gap-2">
          <ActivityLogDensityToggle density={density} onChange={setDensity} />
          <InfiniteListBase
            resource="activity_log"
            filter={companyId ? { company_id: companyId } : {}}
            sort={{ field: "date", order: "DESC" }}
            perPage={pageSize}
            disableSyncWithLocation
          >
            <ActivityLogIterator />
          </InfiniteListBase>
        </div>
      </ActivityLogDensityContext.Provider>
    </ActivityLogContext.Provider>
  );
}
