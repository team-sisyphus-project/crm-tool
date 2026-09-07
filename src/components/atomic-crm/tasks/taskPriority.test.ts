import { describe, expect, it } from "vitest";

import { isHighPriority, taskPriorityChoices } from "./taskPriority";

describe("isHighPriority", () => {
  it("recognizes a task a person flagged as high priority", () => {
    expect(isHighPriority({ priority: "high" })).toBe(true);
  });

  it("does not flag a task left at normal priority", () => {
    expect(isHighPriority({ priority: "normal" })).toBe(false);
  });

  it("treats an unset priority as normal", () => {
    expect(isHighPriority({})).toBe(false);
    expect(isHighPriority({ priority: null })).toBe(false);
  });
});

describe("taskPriorityChoices", () => {
  it("offers exactly the priorities the task model accepts", () => {
    expect(taskPriorityChoices.map((choice) => choice.id)).toEqual([
      "normal",
      "high",
    ]);
  });
});
