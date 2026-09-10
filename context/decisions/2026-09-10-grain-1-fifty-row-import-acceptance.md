# grain-1: proving the 50-row / 5-duplicate import instead of building for it

Date: 2026-09-10
Status: accepted
Scope: `src/components/atomic-crm/contacts/import/ContactImportDialog.scale.test.tsx`

## Context

The assignment — "import 50 rows with 5 duplicates" — names a scenario, not a
missing capability. The wizard, the duplicate policy and the summary already
exist, and the grain's constraint is explicit: *uses existing create/update*.

What did not exist was evidence. Every test of this feature drives two or three
rows, which is a single batch: `IMPORT_BATCH_SIZE` is 10, so no existing test
ever crosses a batch boundary. The run's memory of what it has already claimed
(`ImportRun.claimed` / `.matches`) only matters *between* batches, and the risk
of getting it wrong is the one the duplicate policy was added to prevent — a
second contact for a person the CRM already has.

## Decision

**Satisfy the grain with an acceptance test over the existing path, and add no
production code.**

A successor reading `git log` will see a feature grain that changed no feature
file; this record is why. The grain asked for a scenario to work at a size
nothing had exercised, and it already did. Writing code to make a passing
scenario pass would have been invented work, and the constraint forbade
touching create/update anyway.

**The five duplicates sit at rows 5, 15, 25, 35 and 45 — one per batch.**

Clustering them at the top of the file would let a single round-trip find them
all and would prove nothing about the batches that follow. One per batch means
each is found by a batch that has to carry forward what the previous four
learned. Rejected: 5 duplicates in the first 5 rows (cheaper to read, exercises
nothing) and randomised positions (a test that fails differently each run is
not evidence).

**Reads go to the real FakeRest backend; only `create`/`update` are stubbed.**

The thing under test is whether the CRM *finds* the five duplicates, so the
search has to be the real one — the `q` filter, substring-matched over
`email_jsonb`, exactly as `useContactImport` issues it. Stubbing the two writes
buys precision (which rows were written, and with what) without touching the
read path. Rejected: stubbing `getList` too, which would have asserted the
importer's arithmetic against a search that always agreed with it.

## Consequences

- Confirmed by falsification, not just by passing: with the five contacts
  removed from the seeded CRM both tests fail (`50 created, 0 skipped`), so the
  assertions are driven by real duplicate detection.
- Closes "behaviour at real file sizes" for the duplicate path specifically.
  The other unknowns recorded against it — search fan-out cost, `dynamicTyping`
  coercing numeric phone cells, `EMAIL_SEARCH_LIMIT` at 25 — are untouched:
  this file has 50 rows and no phone column, so it does not reach them.
- The two tests run in the browser project and take ~4s together, five batches
  of real round-trips at FakeRest's 300ms latency. They carry explicit timeouts
  because the default per-test budget is sized for two-row files.
