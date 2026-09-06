import { createContext, useContext } from "react";

/**
 * How much room each activity item gets.
 * - `comfortable`: the default reading view — full note text and follow-up line.
 * - `compact`: one dense timeline row per activity, for scanning a long history.
 */
export type ActivityLogDensity = "comfortable" | "compact";

export const ActivityLogDensityContext =
  createContext<ActivityLogDensity>("comfortable");

export const useActivityLogDensity = () =>
  useContext(ActivityLogDensityContext);

export const useIsCompactActivityLog = () =>
  useActivityLogDensity() === "compact";
