export const validateNoteOrAttachmentRequired = (
  value: string | null | undefined,
  values: { attachments?: unknown[] | null },
) => {
  const hasText = typeof value === "string" && value.trim().length > 0;
  const hasAttachments =
    Array.isArray(values?.attachments) && values.attachments.length > 0;

  return hasText || hasAttachments
    ? undefined
    : "resources.notes.validation.note_or_attachment_required";
};

/**
 * A reminder date is only meaningful next to the action it refers to:
 * a date alone would be stored but never rendered.
 */
export const validateReminderDateRequiresText = (
  value: string | null | undefined,
  values: { next_action?: string | null },
) => {
  const hasDate = typeof value === "string" && value.length > 0;
  const hasNextAction =
    typeof values?.next_action === "string" &&
    values.next_action.trim().length > 0;

  return hasDate && !hasNextAction
    ? "resources.notes.validation.next_action_required_with_date"
    : undefined;
};
