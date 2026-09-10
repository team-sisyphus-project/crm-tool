# Contact import: the mapping is the state, not a step

Date: 2026-09-10
Grain: grain-3 — Column-to-field mapping step

## Decision

The wizard gains a mapping step without gaining a step setter. The `ready`
source keeps one new field:

    { status: "ready"; file: File; preview: CsvPreview; mapping: ColumnMapping | null }

and the derivation table grows one line:

    source is "ready", mapping is null   -> "preview"
    source is "ready", mapping is set    -> "mapping"

Continuing from the preview is therefore not `setStep("mapping")` — it is
`autoMapColumns(headers)`, producing the very thing the next step renders. Going
back drops the mapping. This is the shape grain-2's decision record prescribed
for exactly this grain.

The mapping itself carries one invariant, enforced in the pure module rather
than in the UI: **a field belongs to at most one column.** `autoMapColumns`
gives a field to the first header that claims it, and `setColumnField` takes it
away from whoever held it before. An unrecognised header maps to `null`
("do not import") rather than being guessed.

The import runs against the mapping captured at start (`activeMappingRef`), not
against the live one.

## Why

Two columns pointing at the same field is representable in a naive
`Record<header, field>`, and it silently drops one of them: `applyMapping` would
write `first_name` twice and the last write would win, with nothing in the UI to
say which column lost. Making the mapping a bijection at the module level means
the select can simply disable a field another column already holds, and the
duplicate case never reaches `applyMapping`.

Capturing the mapping at start matters because the mapping step stays mounted
underneath a running import: without the snapshot, a late re-render could feed a
half-edited mapping to a batch already in flight.

## Rejected

- **A `stage: "preview" | "mapping"` field on the ready source.** A step setter
  wearing a different name; reopens the drift grain-2 closed. Rejected.
- **Folding the mapping into the preview table** (a select under each preview
  column header). Fewer steps, but it mixes "here is what we read" with "here is
  what you must decide", and the required-field guard would have nowhere
  unambiguous to block. Rejected.
- **A synonym table** (`email` -> `email_work`, `firstname` -> `first_name`, ...).
  More auto-matches, but every entry is a guess that the user then has to
  notice and undo. Case/separator-insensitive matching is unambiguous; anything
  beyond it is left to the user, who is now shown every column and its first
  value. Rejected for now.
- **Defaulting unmapped fields to `""` in `applyMapping`.** Would have made the
  return type honest, but it changes what reaches the data provider today
  (`undefined`, which the importer already reads defensively). Rejected: the
  mapping step is not the place to change import semantics.
