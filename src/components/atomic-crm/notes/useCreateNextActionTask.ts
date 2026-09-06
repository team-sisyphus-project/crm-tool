import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCreate, useNotify } from "ra-core";

import type { Task } from "../types";
import {
  buildNextActionTask,
  isSameNextAction,
  type NextActionNote,
} from "./nextActionTask";

/**
 * Returns a callback turning a note's next action into a reminder task.
 *
 * Safe to call after every note save: it is a no-op when the note carries no
 * next action, and on an edit that left the next action untouched — so editing
 * a note's text never duplicates its reminder. Changing the next action itself
 * is a new commitment, and does yield a new task.
 *
 * A failed reminder never fails the note save: the note is already persisted at
 * that point, so the user is warned instead.
 */
export const useCreateNextActionTask = () => {
  const [create] = useCreate<Task>();
  const queryClient = useQueryClient();
  const notify = useNotify();

  return useCallback(
    async (
      note: NextActionNote,
      previousNote?: NextActionNote | null,
    ): Promise<Task | null> => {
      if (previousNote && isSameNextAction(note, previousNote)) return null;

      const data = buildNextActionTask(note);
      if (!data) return null;

      try {
        const task = await create(
          "tasks",
          { data },
          { returnPromise: true, mutationMode: "pessimistic" },
        );
        // Task lists live outside this form (contact page, dashboard), so they
        // do not share the note mutation's cache scope.
        await queryClient.invalidateQueries({ queryKey: ["tasks"] });
        return task ?? null;
      } catch (error) {
        console.error("Failed to create the next action reminder", error);
        notify("resources.tasks.next_action_failed", {
          type: "warning",
          messageArgs: { _: "The reminder could not be created" },
        });
        return null;
      }
    },
    [create, notify, queryClient],
  );
};
