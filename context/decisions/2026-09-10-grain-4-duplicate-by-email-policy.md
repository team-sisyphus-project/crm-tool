# grain-4: matching an imported row to a contact that already exists

Date: 2026-09-10
Status: accepted
Scope: `src/components/atomic-crm/contacts/useContactImport.tsx`,
`src/components/atomic-crm/contacts/import/duplicates.ts`

## Context

Importing the same CSV twice used to produce two of every contact: every row
became a `create`. The import now asks for one policy per run — leave existing
contacts alone (default) or update them from the file — which forces three
questions the code had never had to answer.

## Decision

**1. The match key is the email address, compared in lower case, and confirmed
in the client.**

There is no unique email column to query: a contact's addresses live inside
`email_jsonb`, exposed as the `email_fts` text of a JSON array. The lookup goes
through the `q` filter — the same full-text search the contact list uses, and the
only email search both data providers (Supabase and FakeRest) support — and is a
substring match, so it answers with near-misses: a search for
`jane@acme.example` also returns `notjane@acme.example`. `matchContactByEmail`
therefore re-checks each candidate on the whole address before anything is
written. Rejected: a dedicated `email_fts@ilike` filter (Supabase-only, and still
a substring match) and a new unique index (schema change, out of scope).

**2. The first line of the file carrying an address is the one the run acts on;
later lines carrying it are skipped, whichever policy is in force.**

A file that lists the same person twice gives the run no way to say which line is
authoritative, and acting on both would race two writes on one record. So
"update" is a statement about contacts already in the CRM, not about the file's
own repeats. The run remembers claimed addresses across batches, so this holds
whether the repeat lands in the same batch or a later one. Rejected: last-write-
wins (racy inside a batch, and silently prefers the line the user is least likely
to have meant).

**3. "Update" merges; it never blanks.**

A column the CSV leaves out is not a statement that the CRM's value is wrong, so
`buildContactPatch` writes only the fields the row actually carries. Emails,
phone numbers and tags are added to what the contact already holds rather than
replacing it — a file carrying only a work address must not cost the contact
their home one — and `sales_id` is never reassigned by an import. A row that adds
nothing is counted as skipped instead of sending an empty write.

## Consequences

- One extra search per distinct address per run (cached for the run's lifetime),
  on top of the existing company and tag lookups.
- Rows carrying no email at all are always created: there is no key to recognise
  them by, and inventing one (name, phone) is the merge problem, not this one.
- Outcomes are counted in `useContactImport` — created / updated / skipped — and
  are separate from `usePapaParse`'s row and error counters, which stay
  domain-free.
