/**
 * A single "label: value" row inside an `AsideSection`.
 *
 * When the value is empty, a muted placeholder is rendered instead of hiding the
 * row, so an empty field reads as "none" rather than "not loaded".
 */
export const AsideInfoRow = ({
  label,
  value,
  emptyText,
}: {
  label: string;
  value?: string | null;
  emptyText: string;
}) => (
  <span className="text-sm">
    {label}:{" "}
    {value ? value : <span className="text-muted-foreground">{emptyText}</span>}
  </span>
);
