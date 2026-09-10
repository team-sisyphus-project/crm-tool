import type { ContactImportSchema } from "../useContactImport";

/** A parsed CSV row: the file's header row is the key set. */
export type CsvRow = Record<string, unknown>;

/** A contact field a CSV column can be sent to. */
export type ImportField = keyof ContactImportSchema;

/**
 * Every importable field, in the order the mapping step offers them, and
 * whether a contact can be created without it.
 *
 * Typed as a total record of `ContactImportSchema`, so a field added to the
 * schema without an entry here is a compile error rather than a column nobody
 * can ever map.
 */
const FIELD_REQUIREMENT: Record<ImportField, "required" | "optional"> = {
  first_name: "required",
  last_name: "required",
  email_work: "optional",
  email_home: "optional",
  email_other: "optional",
  phone_work: "optional",
  phone_home: "optional",
  phone_other: "optional",
  company: "optional",
  title: "optional",
  gender: "optional",
  status: "optional",
  tags: "optional",
  background: "optional",
  linkedin_url: "optional",
  avatar: "optional",
  has_newsletter: "optional",
  first_seen: "optional",
  last_seen: "optional",
};

/** All importable fields, in the order the mapping step lists them. */
export const IMPORT_FIELDS = Object.keys(FIELD_REQUIREMENT) as ImportField[];

/** Fields the import cannot run without. */
export const REQUIRED_IMPORT_FIELDS = IMPORT_FIELDS.filter(
  (field) => FIELD_REQUIREMENT[field] === "required",
);

export const isRequiredImportField = (field: ImportField): boolean =>
  FIELD_REQUIREMENT[field] === "required";

/**
 * Which field each CSV column feeds. `null` means "do not import this column":
 * an explicit decision, so a header we did not recognise is never guessed into
 * a field.
 */
export type ColumnMapping = Record<string, ImportField | null>;

/**
 * Comparison key for a header. Case, spaces, underscores, dashes and
 * punctuation carry no meaning here, so `First Name`, `first_name` and
 * `FIRSTNAME` are all the same column.
 */
const comparisonKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

const FIELD_BY_KEY = new Map(
  IMPORT_FIELDS.map((field) => [comparisonKey(field), field] as const),
);

/**
 * First guess at where each column goes, from the header names alone.
 *
 * A field is claimed by at most one column: when two headers point at the same
 * field the first one wins and the others start out ignored, because two
 * columns writing the same field would silently drop one of them.
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const claimed = new Set<ImportField>();

  return Object.fromEntries(
    headers.map((header) => {
      const match = FIELD_BY_KEY.get(comparisonKey(header)) ?? null;
      const field = match !== null && !claimed.has(match) ? match : null;
      if (field !== null) {
        claimed.add(field);
      }
      return [header, field] as const;
    }),
  );
}

/**
 * Sends a column to a field, or to `null` to leave it out of the import.
 *
 * A field belongs to one column at a time: whichever column held it before
 * gives it up, so the mapping can never ask the importer to fill the same field
 * twice. Returns a new mapping; the given one is left untouched.
 */
export function setColumnField(
  mapping: ColumnMapping,
  header: string,
  field: ImportField | null,
): ColumnMapping {
  return Object.fromEntries(
    Object.entries(mapping).map(([key, current]) => {
      if (key === header) return [key, field] as const;
      const isTakenOver = field !== null && current === field;
      return [key, isTakenOver ? null : current] as const;
    }),
  );
}

/** The field a column feeds, `null` when the column is left out. */
export const fieldOfColumn = (
  mapping: ColumnMapping,
  header: string,
): ImportField | null => mapping[header] ?? null;

/** The column feeding a field, `null` when no column does. */
export const columnOfField = (
  mapping: ColumnMapping,
  field: ImportField,
): string | null =>
  Object.entries(mapping).find(([, mapped]) => mapped === field)?.[0] ?? null;

/**
 * Required fields no column feeds yet. The import stays blocked while this is
 * not empty — importing half-identified contacts is worse than not importing.
 */
export function missingRequiredFields(mapping: ColumnMapping): ImportField[] {
  const mapped = new Set(Object.values(mapping));
  return REQUIRED_IMPORT_FIELDS.filter((field) => !mapped.has(field));
}

/**
 * Rewrites one CSV row into the shape the contact importer reads: keys become
 * contact fields and ignored columns are dropped.
 *
 * The cast is deliberate and matches what already happens today: Papa Parse
 * types its rows as a complete `ContactImportSchema` while a file that omits a
 * column simply has no such key, and the importer reads every optional field
 * defensively. Mapping keeps that contract instead of inventing empty values
 * for the fields the user chose not to import.
 */
export function applyMapping(
  row: CsvRow,
  mapping: ColumnMapping,
): ContactImportSchema {
  return Object.fromEntries(
    Object.entries(mapping)
      .filter(([, field]) => field !== null)
      .map(([header, field]) => [field, row[header]] as const),
  ) as ContactImportSchema;
}
