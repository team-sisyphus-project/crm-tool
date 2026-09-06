import { Rows3 } from "lucide-react";
import { useTranslate } from "ra-core";

import { Button } from "@/components/ui/button";
import type { ActivityLogDensity } from "./ActivityLogDensityContext";

type ActivityLogDensityToggleProps = {
  density: ActivityLogDensity;
  onChange: (density: ActivityLogDensity) => void;
};

/** Switches the activity log between the reading view and the compact timeline. */
export function ActivityLogDensityToggle({
  density,
  onChange,
}: ActivityLogDensityToggleProps) {
  const translate = useTranslate();
  const isCompact = density === "compact";

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={isCompact}
        onClick={() => onChange(isCompact ? "comfortable" : "compact")}
      >
        <Rows3 />
        {translate("crm.activity.compact_view", { _: "Compact view" })}
      </Button>
    </div>
  );
}
