import type { Task, TaskPriority } from "../types";

export const HIGH_PRIORITY: TaskPriority = "high";

/**
 * Importance is set by a person; lateness is set by the clock. The two are
 * separate axes, so this predicate never looks at the due date.
 */
export const isHighPriority = (task: Pick<Task, "priority">) =>
  task.priority === HIGH_PRIORITY;

/** Choice names are translation keys: the select input translates them. */
export const taskPriorityChoices: { id: TaskPriority; name: string }[] = [
  { id: "normal", name: "resources.tasks.priority.normal" },
  { id: "high", name: "resources.tasks.priority.high" },
];
