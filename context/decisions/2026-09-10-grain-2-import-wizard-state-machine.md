# Contact import: one derived state machine behind the wizard

Date: 2026-09-10
Grain: grain-2 — Extract multi-step wizard shell with upload + preview

## Decision

`useContactImportWizard` owns the whole import flow. It holds exactly one piece
of authored state — the selected file and what reading it produced
(`empty` / `reading` / `ready` / `invalid`) — and *derives* the visible step from
that plus the `usePapaParse` importer state:

    parsing | running            -> "running"
    complete | error             -> "summary"
    source is "ready"            -> "preview"
    otherwise                    -> "upload"

The dialog and the step components render what the hook reports; they hold no
step state of their own.

## Why

The alternative was an explicit `step` state updated by each action
(`setStep("preview")` after a successful parse, `setStep("running")` on import,
and so on). That stores the same fact twice — once in `step`, once in the
importer — and every new branch (a failed parse, a stopped import, reopening the
dialog) is another chance for the two to disagree. Deriving the step makes those
states unrepresentable: a running import cannot be displayed on the upload step
because there is no assignment that could put it there.

The cost is that the step is not directly settable, so "go back" is expressed as
a change to the source (`goToUpload` drops the selection) rather than a step
assignment. That is a real constraint and it is the point: going back to the
upload step with a file still selected would immediately derive back to
"preview".

## Rejected

- **Explicit `step` state.** Simpler to read line by line, but it duplicates the
  importer's state and invites drift. Rejected.
- **A reducer over a union of step objects.** Would also make invalid states
  unrepresentable, but the flow has one authored input (the file) and one
  external machine (the importer); a reducer adds ceremony without removing a
  failure mode here. Rejected for now — reconsider when column mapping and the
  duplicate policy add their own authored state.

## Consequence for the next grains

Column mapping and the duplicate policy add authored state, not steps: extend
the `SourceState` union (a `ready` source gains a mapping) and add the step to
the derivation table plus `IMPORT_STEPS`. Do not introduce a parallel `step`
setter — that would reopen the drift this decision closes.
