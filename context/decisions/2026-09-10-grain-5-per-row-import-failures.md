# A failed row is a row, not a number

Date: 2026-09-10 (grain-5)
Status: accepted

## Context

Before this grain the import counted errors and threw the evidence away: a batch
that raised anything at all added `batch.length` to an `errorCount`, and the rows
themselves were gone. A user whose file had one bad line among two hundred was
told "3 errors" and left to find them by hand.

The card asks for the opposite: the rows come back as a CSV the user can fix and
re-import.

## Decision

**The failure list is the record, and the only error count.**

- `usePapaParse` state carries `failures: ImportRowFailure[]` instead of an
  `errorCount`. The count displayed anywhere is `failures.length`, so a number
  and a list can never disagree.
- `processBatch` returns the rows it could not write rather than throwing on the
  first one. A batch now lands partially: what the CRM accepted stays written,
  the rest come back with a reason. A throw is still handled — it means the batch
  died as a whole, so every row in it becomes a failure with that one reason.
- Failures carry the row **as the file had it**, before the column mapping, so
  the downloaded report re-imports unchanged.
- Rows the parser itself could not read never reach the importer: they are
  failures from the start, with the parser's own message as the reason.
- Serialisation is `Papa.unparse` — the same library that read the file. Quoting
  and escaping a value that carries a comma, a quote or a line break is a solved
  problem, and solving it twice is how the two answers drift apart.

**Outcomes count settled rows; failures are counted separately.** `ImportOutcomes`
keeps `created` / `updated` / `skipped` and gains no `failed` field. A refused row
was settled by nobody, and the failure list already knows both how many and why —
including the parse failures the importer never saw, which an outcome counter
could not have known about.

**A failed row claims nothing.** The run's per-file duplicate memory only records
the emails of rows that settled. A row that failed leaves its address unclaimed,
so a later row carrying the same address is free to try again instead of being
skipped as a duplicate of a contact that was never created.

## Rejected

- **Keeping `errorCount` alongside the list.** Two representations of one fact,
  updated in two places. The parse-error path already made them drift once.
- **Adding `failed` to `ImportOutcomes`.** It would have made the four counters
  sum to the batch size, which reads well, but the summary would then state the
  failure count three times (result sentence, outcome line, failure block) and
  the field would still be blind to parse failures.
- **Aborting the batch on the first refused row.** Simpler code, worse outcome:
  nine good rows are punished for the tenth, and the user cannot tell which of
  the ten to fix.
- **Writing our own CSV escaper.** Twenty lines, and a category of bug
  (`"Acme, Inc."`, `The "boss"`, a note with a line break) that a spreadsheet
  reveals only after the user has already re-imported the file.
