# grain-1: CSV contact import wizard — Story draft

## Status

DRAFT. A human settles it; this stays a draft.

The card asks for this Story to be persisted with the autosquad dev MCP tool
`planning_doc.save` (board `brd_3seyl4ks3kiolzry`, doc_type `story`). That MCP
tool is **not exposed in this session** — the only configured MCP server is
`playwright` (which itself failed to connect), and `ToolSearch` returns no match
for `planning_doc`, `autosquad`, or `planning doc save story board`. The API call
therefore could not be performed. The draft content is recorded here verbatim so
a session with the MCP tool connected can carry it into `planning_doc.save`
without rewriting it. The ready-to-submit payload is at the bottom of this file.

No prior draft exists for this card (the job's context folders were empty at
session start), so this is the first and only draft.

## Story

- **WHO**: the admin of a sales team that has just been given an Atomic CRM
  workspace, holding the team's existing book of business as a CSV exported from
  another tool (HubSpot, Pipedrive, a Google Sheet).
- **WHEN**: on first-run onboarding, and again a day later when they re-run the
  same file after fixing the rows that did not go in the first time.
- **WANTS**: to upload the CSV, map its own column headers onto Atomic CRM
  contact fields, see a preview of exactly what will be created and what will be
  matched against an existing contact, pick one duplicate policy (skip or update)
  for rows whose email matches a contact already in the CRM, and end on a summary
  screen that lets them download the failed rows as a CSV.
- **SO THAT**: they get the whole book of business in during one sitting without
  hand-editing the file's header row to match field names they cannot guess,
  without silently doubling their contact list on the second attempt, and with a
  file of just the broken rows they can fix and re-upload instead of hunting
  through the original spreadsheet.

## Current Wiki Spec (as implemented today — the baseline these proposals change)

Sources: `src/components/atomic-crm/contacts/ContactImportButton.tsx`,
`useContactImport.tsx`, `src/components/atomic-crm/misc/usePapaParse.tsx`.

1. Import is a single-step dialog: download the sample CSV, pick a file, press
   Import. There is no mapping step and no preview.
2. Column headers must match the `ContactImportSchema` keys exactly
   (`first_name`, `email_work`, `phone_home`, …). A non-matching header is parsed
   into a field the importer never reads, so the value is silently dropped.
3. Every row becomes `dataProvider.create("contacts", …)`. There is no duplicate
   check at all, so importing the same file twice produces two of every contact.
   (Companies and tags *are* get-or-create by name via `fetchRecordsWithCache`;
   contacts are not.)
4. Rows are processed in batches of 10, and a batch is awaited as a whole: one
   bad row rejects the batch and `errorCount` is incremented by the full batch
   size, so up to 9 rows are reported as failures without having failed.
5. The outcome is three counters (`rowCount`, `importCount`, `errorCount`). The
   user is never told *which* rows failed or *why*, and nothing is downloadable.

## Change proposals

1. **Replace the one-shot dialog with a four-step wizard** — Upload → Map →
   Preview → Result — inside the existing `ContactImportDialog`, one step
   component per file. Changes spec item 1.
2. **Add a column-mapping step.** Parse the header row first, propose a mapping
   per column (exact match, then a normalised match so `First Name` /
   `first name` / `FIRST_NAME` all land on `first_name`), let the user correct
   any row of the mapping and mark a column "do not import". Nothing is dropped
   silently: an unmapped column is shown as unmapped. Changes spec item 2.
3. **Add duplicate handling keyed on email.** Before the create pass, look up the
   file's emails against existing contacts in one batched query and let the user
   pick a single policy for the run: **skip** (default — matched rows are counted
   and not written) or **update** (matched rows go through the existing
   `dataProvider.update` and unmatched rows through the existing
   `dataProvider.create`; no new write path). Changes spec item 3.
4. **Make the error report per-row and downloadable.** Settle each row
   individually rather than awaiting a batch as a unit, so a failure is charged to
   the row that caused it, and offer the failed rows on the summary step as a CSV
   containing the original columns plus a `error` reason column. Changes spec
   items 4 and 5.

Constraint honoured throughout: writes go through the existing
`dataProvider.create` / `dataProvider.update`; no new backend endpoint, no schema
change.

## Measures (verification targets)

- **Primary (number).** Import the same 50-row CSV twice with the duplicate
  policy set to *skip*. The number of contacts created on the second run is
  **0**, and the second run's summary reports 50 skipped.
- **Secondary (number).** A CSV whose headers are the source tool's own
  (`First Name`, `Last Name`, `Email`, `Company`) imports every row successfully
  with **0** manual edits to the file.
- **Secondary (true/false).** Every row counted in the summary's error total
  appears exactly once in the downloadable error CSV — i.e.
  `rows(error CSV) === errorCount` — including the case where one bad row sits in
  a batch of ten good ones. **true**
- **Secondary (true/false).** Nothing is written to the CRM before the user
  confirms on the Preview step. **true**

## Validation attached

One Given→When→Then scenario is attached to this Story (`doc_type` `scenario`,
`story_planning_doc_external_id` pointing at this Story). Rationale for attaching
one at all: the *update* duplicate policy overwrites fields on contacts that
already exist in the customer's CRM, and the match key (email) lives inside the
`email_jsonb` array rather than a unique column — a wrong or fuzzy match
overwrites the wrong person's record and is not undoable from the UI. That is the
explicit user-path risk the card names, so it gets an explicit check.

### Scenario — duplicate contact is updated, never duplicated

- **Given** the CRM already contains a contact `Jane Roe` whose work email is
  `jane@acme.example` and whose title is `Analyst`,
- **And** the admin has a CSV containing one row for `jane@acme.example` with the
  title `Head of Analytics` and one row for a brand-new `sam@acme.example`,
- **When** the admin uploads the file, accepts the proposed column mapping,
  chooses the duplicate policy **update**, and confirms on the Preview step
  (which shows `1 to update, 1 to create`),
- **Then** the CRM contains exactly one contact for `jane@acme.example`, her
  title reads `Head of Analytics`, her existing id and her fields that the CSV
  did not carry are unchanged, one new contact exists for `sam@acme.example`, and
  the summary reports `1 created, 1 updated, 0 failed`.

## `planning_doc.save` payload (to submit when the MCP tool is reachable)

Two calls: save the story first, then the scenario with the story's returned
external id in `story_planning_doc_external_id`.

    planning_doc.save({
      board: "brd_3seyl4ks3kiolzry",
      doc_type: "story",
      story_struct: {
        who:   "<WHO above>",
        when:  "<WHEN above>",
        wants: "<WANTS above>",
        so_that: "<SO THAT above>",
        change_proposals: ["<proposal 1>", "<proposal 2>", "<proposal 3>", "<proposal 4>"]
      },
      measures: [
        "Re-importing the same 50-row CSV with policy=skip creates 0 new contacts",
        "A CSV with the source tool's own headers imports with 0 manual file edits",
        "rows(downloadable error CSV) === reported errorCount -> true",
        "No contact is written before the user confirms on the Preview step -> true"
      ]
    })

    planning_doc.save({
      board: "brd_3seyl4ks3kiolzry",
      doc_type: "scenario",
      story_planning_doc_external_id: "<external id returned by the story save>",
      // Given / When / Then as written under "Scenario" above
    })
