import {
  useDataProvider,
  useGetIdentity,
  type DataProvider,
  type Identifier,
} from "ra-core";
import { useCallback, useMemo, useRef, useState } from "react";

import type { Company, Contact, Tag } from "../types";
import type { DuplicatePolicy, ImportOutcomes } from "./import/duplicates";
import {
  addOutcomes,
  buildContactPatch,
  decideBatch,
  emailEntries,
  isEmptyPatch,
  matchContactByEmail,
  NO_IMPORT_OUTCOMES,
  phoneEntries,
  rowEmails,
} from "./import/duplicates";

export type ContactImportSchema = {
  first_name: string;
  last_name: string;
  gender: string;
  title: string;
  company: string;
  email_work: string;
  email_home: string;
  email_other: string;
  phone_work: string;
  phone_home: string;
  phone_other: string;
  background: string;
  avatar: string;
  first_seen: string;
  last_seen: string;
  has_newsletter: string;
  status: string;
  tags: string;
  linkedin_url: string;
};

/**
 * What one import run remembers between its batches: the emails it has already
 * acted on, and the existing contacts it found for them. Recreated per run, so
 * a second import of the same file starts from a clean slate.
 */
export type ImportRun = {
  claimed: Set<string>;
  matches: Map<string, Contact>;
};

export const createImportRun = (): ImportRun => ({
  claimed: new Set<string>(),
  matches: new Map<string, Contact>(),
});

/**
 * How many contacts one email search may bring back. The search is a substring
 * match over several columns, so it answers with near-misses; a handful is
 * plenty to find the one that actually owns the address.
 */
const EMAIL_SEARCH_LIMIT = 25;

/**
 * Fills the run's match table for the emails it does not know yet.
 *
 * Searches with the `q` filter — the same full-text search the contact list
 * uses — because it is the one email lookup both data providers support. It
 * matches loosely on purpose; `matchContactByEmail` settles which candidate, if
 * any, really owns the address.
 */
const findContactsByEmail = async (
  dataProvider: DataProvider,
  emails: string[],
  run: ImportRun,
): Promise<void> => {
  const unknown = emails.filter(
    (email) => !run.matches.has(email) && !run.claimed.has(email),
  );

  await Promise.all(
    unknown.map(async (email) => {
      const { data } = await dataProvider.getList<Contact>("contacts", {
        filter: { q: email },
        pagination: { page: 1, perPage: EMAIL_SEARCH_LIMIT },
        sort: { field: "id", order: "ASC" },
      });
      const match = matchContactByEmail(data ?? [], email);
      if (match !== null) {
        run.matches.set(email, match);
      }
    }),
  );
};

type ImportContactBatchParams = {
  batch: ContactImportSchema[];
  policy: DuplicatePolicy;
  dataProvider: DataProvider;
  /** Mutable run memory, shared by every batch of the same import. */
  run: ImportRun;
  /** Companies of this batch, already resolved by name. */
  companies: Map<string, Company>;
  /** Tags of this batch, already resolved by name. */
  tags: Map<string, Tag>;
  salesId?: Identifier;
  /** Fallback timestamp for rows that carry no date of their own. */
  today: string;
};

const resolveCompanyId = (
  row: ContactImportSchema,
  companies: Map<string, Company>,
): Identifier | undefined => {
  const name = row.company?.trim();
  return name ? companies.get(name)?.id : undefined;
};

const resolveTagIds = (
  row: ContactImportSchema,
  tags: Map<string, Tag>,
): number[] =>
  parseTags(row.tags)
    .map((name) => tags.get(name))
    .filter((tag): tag is Tag => !!tag)
    .map((tag) => tag.id as number);

/**
 * Writes one batch of rows, honouring the duplicate policy the user chose.
 *
 * Rows that match a contact already in the CRM are either left alone or patched
 * — never created a second time — and every row is counted under the outcome it
 * actually got. Exported (rather than kept inside the hook) so the policy can be
 * exercised against a data provider without rendering anything.
 */
export async function importContactBatch({
  batch,
  policy,
  dataProvider,
  run,
  companies,
  tags,
  salesId,
  today,
}: ImportContactBatchParams): Promise<ImportOutcomes> {
  const emails = [...new Set(batch.flatMap(rowEmails))];
  await findContactsByEmail(dataProvider, emails, run);

  const decisions = decideBatch(batch, run.matches, run.claimed, policy);

  const outcomes = await Promise.all(
    decisions.map(async (decision, index): Promise<keyof ImportOutcomes> => {
      const row = batch[index];

      if (decision.action === "skip") return "skipped";

      const companyId = resolveCompanyId(row, companies);
      const tagIds = resolveTagIds(row, tags);

      if (decision.action === "update") {
        const patch = buildContactPatch(row, decision.contact, {
          companyId,
          tagIds,
        });
        // Nothing this row carries is new to the contact, so there is nothing
        // to write: report it as left alone rather than as an empty update.
        if (isEmptyPatch(patch)) return "skipped";

        await dataProvider.update<Contact>("contacts", {
          id: decision.contact.id,
          data: patch,
          previousData: decision.contact,
        });
        return "updated";
      }

      await dataProvider.create("contacts", {
        data: {
          first_name: row.first_name,
          last_name: row.last_name,
          gender: row.gender,
          title: row.title,
          email_jsonb: emailEntries(row),
          phone_jsonb: phoneEntries(row),
          background: row.background,
          first_seen: row.first_seen
            ? new Date(row.first_seen).toISOString()
            : today,
          last_seen: row.last_seen
            ? new Date(row.last_seen).toISOString()
            : today,
          has_newsletter: row.has_newsletter,
          status: row.status,
          company_id: companyId,
          tags: tagIds,
          sales_id: salesId,
          linkedin_url: row.linkedin_url,
        },
      });
      return "created";
    }),
  );

  // Every email this batch touched is now the run's business: a later row
  // repeating one of them is a duplicate inside the file, not a new contact.
  for (const decision of decisions) {
    for (const email of decision.emails) {
      run.claimed.add(email);
    }
  }

  return outcomes.reduce(
    (total, outcome) => ({ ...total, [outcome]: total[outcome] + 1 }),
    NO_IMPORT_OUTCOMES,
  );
}

export function useContactImport() {
  const today = new Date().toISOString();
  const user = useGetIdentity();
  const dataProvider = useDataProvider();

  // company cache to avoid creating the same company multiple times and costly roundtrips
  // Cache is dependent of dataProvider, so it's safe to use it as a dependency
  const companiesCache = useMemo(
    () => new Map<string, Company>(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataProvider],
  );
  const getCompanies = useCallback(
    async (names: string[]) =>
      fetchRecordsWithCache<Company>(
        "companies",
        companiesCache,
        names,
        (name) => ({
          name,
          created_at: new Date().toISOString(),
          sales_id: user?.identity?.id,
        }),
        dataProvider,
      ),
    [companiesCache, user?.identity?.id, dataProvider],
  );

  // Tags cache to avoid creating the same tag multiple times and costly roundtrips
  // Cache is dependent of dataProvider, so it's safe to use it as a dependency
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tagsCache = useMemo(() => new Map<string, Tag>(), [dataProvider]);
  const getTags = useCallback(
    async (names: string[]) =>
      fetchRecordsWithCache<Tag>(
        "tags",
        tagsCache,
        names,
        (name) => ({
          name,
          color: "#f9f9f9",
        }),
        dataProvider,
      ),
    [tagsCache, dataProvider],
  );

  const runRef = useRef<ImportRun>(createImportRun());
  const [outcomes, setOutcomes] = useState<ImportOutcomes>(NO_IMPORT_OUTCOMES);

  /** Forgets the previous run, so re-importing a file is not one long run. */
  const startRun = useCallback(() => {
    runRef.current = createImportRun();
    setOutcomes(NO_IMPORT_OUTCOMES);
  }, []);

  const processBatch = useCallback(
    async (batch: ContactImportSchema[], policy: DuplicatePolicy) => {
      const [companies, tags] = await Promise.all([
        getCompanies(
          batch
            .map((contact) => contact.company?.trim())
            .filter((name) => name),
        ),
        getTags(batch.flatMap((contact) => parseTags(contact.tags))),
      ]);

      const batchOutcomes = await importContactBatch({
        batch,
        policy,
        dataProvider,
        run: runRef.current,
        companies,
        tags,
        salesId: user?.identity?.id,
        today,
      });

      setOutcomes((previous) => addOutcomes(previous, batchOutcomes));
    },
    [dataProvider, getCompanies, getTags, user?.identity?.id, today],
  );

  return useMemo(
    () => ({ processBatch, outcomes, startRun }),
    [processBatch, outcomes, startRun],
  );
}

const fetchRecordsWithCache = async function <T>(
  resource: string,
  cache: Map<string, T>,
  names: string[],
  getCreateData: (name: string) => Partial<T>,
  dataProvider: DataProvider,
) {
  const trimmedNames = [...new Set(names.map((name) => name.trim()))];
  const uncachedRecordNames = trimmedNames.filter((name) => !cache.has(name));

  // check the backend for existing records
  if (uncachedRecordNames.length > 0) {
    const response = await dataProvider.getList(resource, {
      filter: {
        "name@in": `(${uncachedRecordNames
          .map((name) => `"${name}"`)
          .join(",")})`,
      },
      pagination: { page: 1, perPage: trimmedNames.length },
      sort: { field: "id", order: "ASC" },
    });
    for (const record of response.data) {
      cache.set(record.name.trim(), record);
    }
  }

  // create missing records in parallel
  await Promise.all(
    uncachedRecordNames.map(async (name) => {
      if (cache.has(name)) return;
      const response = await dataProvider.create(resource, {
        data: getCreateData(name),
      });
      cache.set(name, response.data);
    }),
  );

  // now all records are in cache, return a map of all records
  return trimmedNames.reduce((acc, name) => {
    acc.set(name, cache.get(name) as T);
    return acc;
  }, new Map<string, T>());
};

const parseTags = (tags: string) =>
  tags
    ?.split(",")
    ?.map((tag: string) => tag.trim())
    ?.filter((tag: string) => tag) ?? [];
