import {
  NEXT_ACTION_TASK_TYPE,
  buildNextActionTask,
  isSameNextAction,
} from "./nextActionTask";

const noteWithNextAction = {
  contact_id: 7,
  sales_id: 3,
  next_action: "Send the proposal",
  next_action_date: "2026-03-18T09:00:00.000Z",
};

describe("buildNextActionTask", () => {
  it("turns a note next action into a task for its contact", () => {
    const task = buildNextActionTask(noteWithNextAction);

    expect(task).toEqual({
      contact_id: 7,
      sales_id: 3,
      type: NEXT_ACTION_TASK_TYPE,
      text: "Send the proposal",
      due_date: "2026-03-18T09:00:00.000Z",
      done_date: null,
    });
  });

  it("normalizes the deadline to an ISO string", () => {
    const task = buildNextActionTask({
      ...noteWithNextAction,
      next_action_date: "2026-03-18T09:00:00Z",
    });

    expect(task?.due_date).toBe("2026-03-18T09:00:00.000Z");
  });

  it("trims the next action text", () => {
    const task = buildNextActionTask({
      ...noteWithNextAction,
      next_action: "  Send the proposal  ",
    });

    expect(task?.text).toBe("Send the proposal");
  });

  it("returns null when the note carries no next action", () => {
    expect(
      buildNextActionTask({
        ...noteWithNextAction,
        next_action: null,
        next_action_date: null,
      }),
    ).toBeNull();
  });

  it("returns null when the next action has no deadline to remind on", () => {
    expect(
      buildNextActionTask({ ...noteWithNextAction, next_action_date: null }),
    ).toBeNull();
  });

  it("returns null when the next action is only whitespace", () => {
    expect(
      buildNextActionTask({ ...noteWithNextAction, next_action: "   " }),
    ).toBeNull();
  });

  it("returns null when the deadline cannot be parsed", () => {
    expect(
      buildNextActionTask({
        ...noteWithNextAction,
        next_action_date: "not-a-date",
      }),
    ).toBeNull();
  });

  it("returns null for a deal note, which has no contact to remind about", () => {
    const { contact_id: _contactId, ...dealNote } = noteWithNextAction;

    expect(buildNextActionTask(dealNote)).toBeNull();
  });
});

describe("isSameNextAction", () => {
  it("is true when neither revision has a next action", () => {
    expect(isSameNextAction({ contact_id: 7 }, { contact_id: 7 })).toBe(true);
  });

  it("is true when the next action and its deadline are unchanged", () => {
    expect(
      isSameNextAction(noteWithNextAction, { ...noteWithNextAction }),
    ).toBe(true);
  });

  it("is false when the next action text changed", () => {
    expect(
      isSameNextAction(noteWithNextAction, {
        ...noteWithNextAction,
        next_action: "Send the contract",
      }),
    ).toBe(false);
  });

  it("is false when only the deadline changed", () => {
    expect(
      isSameNextAction(noteWithNextAction, {
        ...noteWithNextAction,
        next_action_date: "2026-03-25T09:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("is false when a next action is added to a note that had none", () => {
    expect(
      isSameNextAction(noteWithNextAction, {
        contact_id: 7,
        next_action: null,
        next_action_date: null,
      }),
    ).toBe(false);
  });
});
