import type { Contact, EmailAndType, PhoneNumberAndType } from "../../types";
import type { ContactImportSchema } from "../useContactImport";

/**
 * What to do with a row whose email already belongs to a contact in the CRM.
 * The user picks one for the whole run, before it starts.
 */
export const DUPLICATE_POLICIES = ["skip", "update"] as const;

export type DuplicatePolicy = (typeof DUPLICATE_POLICIES)[number];

/**
 * Skipping is the default: leaving an existing contact alone is the outcome a
 * user can always undo by re-running with the other policy, while overwriting
 * one is not.
 */
export const DEFAULT_DUPLICATE_POLICY: DuplicatePolicy = "skip";

/** How many rows of a run ended up as each outcome. */
export type ImportOutcomes = {
  created: number;
  updated: number;
  skipped: number;
};

export const NO_IMPORT_OUTCOMES: ImportOutcomes = {
  created: 0,
  updated: 0,
  skipped: 0,
};

export const addOutcomes = (
  a: ImportOutcomes,
  b: ImportOutcomes,
): ImportOutcomes => ({
  created: a.created + b.created,
  updated: a.updated + b.updated,
  skipped: a.skipped + b.skipped,
});

/**
 * The comparison form of an email address: trimmed and lower-cased, `null` when
 * there is nothing to compare. Matching is case-insensitive because a mailbox
 * is — `Jane@Acme.example` and `jane@acme.example` are one person, and the
 * database stores contact emails lower-cased anyway.
 */
export const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "" ? null : normalized;
};

const isNotNull = <T>(value: T | null): value is T => value !== null;

const unique = <T>(values: T[]): T[] => [...new Set(values)];

/** Every email a CSV row carries, in comparison form. */
export const rowEmails = (row: ContactImportSchema): string[] =>
  unique(
    [row?.email_work, row?.email_home, row?.email_other]
      .map(normalizeEmail)
      .filter(isNotNull),
  );

/** Every email an existing contact carries, in comparison form. */
export const contactEmails = (
  contact: Pick<Contact, "email_jsonb"> | null | undefined,
): string[] =>
  unique(
    (contact?.email_jsonb ?? [])
      .map((entry) => normalizeEmail(entry?.email))
      .filter(isNotNull),
  );

/**
 * The contact that actually owns `email`, among the candidates a search
 * returned.
 *
 * The backend search is a substring match over the contact's emails, so it
 * answers with near-misses too (`notjane@acme.example` matches a search for
 * `jane@acme.example`). Updating the wrong person's record is not undoable from
 * the UI, so the match is settled here, on the full address.
 */
export const matchContactByEmail = (
  candidates: Contact[],
  email: string,
): Contact | null =>
  candidates.find((candidate) => contactEmails(candidate).includes(email)) ??
  null;

/** The emails the row carries, and what the run decided to do with it. */
export type ImportDecision = { emails: string[] } & (
  | { action: "create" }
  | { action: "skip" }
  | { action: "update"; contact: Contact }
);

/**
 * What to do with each row of a batch.
 *
 * Three rules, in order:
 *
 * 1. A row carrying no email at all is created — there is no key to recognise
 *    it by, so the run cannot claim it is a duplicate of anything.
 * 2. A row whose email was already handled earlier in the same file is skipped,
 *    whichever policy is in force. The first line carrying an address is the one
 *    the run acts on; a later line repeating it has no way to say it is more
 *    authoritative, and letting both through would race two writes on one record.
 * 3. A row matching a contact already in the CRM follows the chosen policy.
 *
 * Pure: `existing` and `claimed` are read, never written. The caller claims the
 * returned `emails` once the batch has been written.
 */
export function decideBatch(
  batch: ContactImportSchema[],
  existing: ReadonlyMap<string, Contact>,
  claimed: ReadonlySet<string>,
  policy: DuplicatePolicy,
): ImportDecision[] {
  const seen = new Set(claimed);

  return batch.map((row): ImportDecision => {
    const emails = rowEmails(row);
    if (emails.length === 0) return { action: "create", emails };

    const alreadyHandled = emails.some((email) => seen.has(email));
    emails.forEach((email) => seen.add(email));
    if (alreadyHandled) return { action: "skip", emails };

    const contact = emails
      .map((email) => existing.get(email))
      .find((match): match is Contact => match !== undefined);
    if (contact === undefined) return { action: "create", emails };

    // Every address of the matched contact is now spoken for, so a later row
    // reaching the same person through one of their other addresses is a repeat
    // too, and does not get to write over what this one just did.
    contactEmails(contact).forEach((email) => seen.add(email));

    return policy === "skip"
      ? { action: "skip", emails }
      : { action: "update", emails, contact };
  });
}

const hasValue = (value: unknown): boolean =>
  value !== undefined && value !== null && String(value).trim() !== "";

/** The email addresses of a row, in the shape a contact record stores them. */
export const emailEntries = (row: ContactImportSchema): EmailAndType[] =>
  (
    [
      { email: row.email_work, type: "Work" },
      { email: row.email_home, type: "Home" },
      { email: row.email_other, type: "Other" },
    ] as EmailAndType[]
  ).filter(({ email }) => hasValue(email));

/** The phone numbers of a row, in the shape a contact record stores them. */
export const phoneEntries = (row: ContactImportSchema): PhoneNumberAndType[] =>
  (
    [
      { number: row.phone_work, type: "Work" },
      { number: row.phone_home, type: "Home" },
      { number: row.phone_other, type: "Other" },
    ] as PhoneNumberAndType[]
  ).filter(({ number }) => hasValue(number));

/** Adds the entries of `incoming` that `current` does not already hold. */
const mergeEntries = <T>(
  current: T[],
  incoming: T[],
  keyOf: (entry: T) => string | null,
): T[] => {
  const held = new Set(current.map(keyOf).filter(isNotNull));
  return [
    ...current,
    ...incoming.filter((entry) => {
      const key = keyOf(entry);
      if (key === null || held.has(key)) return false;
      held.add(key);
      return true;
    }),
  ];
};

/** The plain text fields a CSV row can carry over onto an existing contact. */
const PATCHABLE_TEXT_FIELDS = [
  "first_name",
  "last_name",
  "gender",
  "title",
  "background",
  "linkedin_url",
  "status",
  "has_newsletter",
] as const;

const DATE_FIELDS = ["first_seen", "last_seen"] as const;

export type ContactResolution = {
  /** The company the row named, once resolved; `undefined` when it named none. */
  companyId?: Contact["company_id"];
  /** The tags the row named, once resolved. */
  tagIds: number[];
};

/**
 * What the "update" policy writes onto an existing contact: the values this row
 * carries, and nothing else.
 *
 * A CSV that leaves a column out is not a statement that the contact's value is
 * wrong, so an absent or blank cell is left alone rather than blanked. Emails,
 * phones and tags are merged into what the contact already has, for the same
 * reason: a file holding only a work address must not cost the contact their
 * home one. Ownership (`sales_id`) is never reassigned by an import.
 *
 * Returns an empty patch when the row has nothing to add; the caller decides
 * what to do with that rather than sending an empty write.
 */
export function buildContactPatch(
  row: ContactImportSchema,
  existing: Contact,
  { companyId, tagIds }: ContactResolution,
): Partial<Contact> {
  // Accumulated untyped for the same reason `applyMapping` casts: the CSV's
  // values are as wide as the file, and the importer has always handed them to
  // the data provider as they came.
  const patch: Record<string, unknown> = {};

  for (const field of PATCHABLE_TEXT_FIELDS) {
    if (hasValue(row[field])) patch[field] = row[field];
  }

  for (const field of DATE_FIELDS) {
    if (hasValue(row[field])) {
      patch[field] = new Date(row[field]).toISOString();
    }
  }

  if (companyId !== undefined && companyId !== existing.company_id) {
    patch.company_id = companyId;
  }

  const emails = mergeEntries(
    existing.email_jsonb ?? [],
    emailEntries(row),
    (entry) => normalizeEmail(entry.email),
  );
  if (emails.length > (existing.email_jsonb ?? []).length) {
    patch.email_jsonb = emails;
  }

  const phones = mergeEntries(
    existing.phone_jsonb ?? [],
    phoneEntries(row),
    (entry) => normalizeEmail(entry.number),
  );
  if (phones.length > (existing.phone_jsonb ?? []).length) {
    patch.phone_jsonb = phones;
  }

  const tags = unique([...(existing.tags ?? []), ...tagIds]);
  if (tags.length > (existing.tags ?? []).length) {
    patch.tags = tags;
  }

  return patch as Partial<Contact>;
}

/** True when a patch would write nothing, so the update can be left out. */
export const isEmptyPatch = (patch: Partial<Contact>): boolean =>
  Object.keys(patch).length === 0;
