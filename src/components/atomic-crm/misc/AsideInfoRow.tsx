import type { ReactNode } from "react";

/**
 * A single "label: value" row inside an `AsideSection`.
 *
 * When the value is empty, a muted placeholder is rendered instead of hiding the
 * row, so an empty field reads as "none" rather than "not loaded".
 *
 * `trailing` is an optional annotation about the value (a badge stating its
 * state, for instance). It sits after the value on the same line and wraps onto
 * its own line when the aside is too narrow for both.
 */
export const AsideInfoRow = ({
  label,
  value,
  emptyText,
  trailing,
}: {
  label: string;
  value?: string | null;
  emptyText: string;
  trailing?: ReactNode;
}) => (
  <span className="inline-flex flex-wrap items-center gap-1 text-sm">
    <span>
      {label}:{" "}
      {value ? (
        value
      ) : (
        <span className="text-muted-foreground">{emptyText}</span>
      )}
    </span>
    {trailing}
  </span>
);
