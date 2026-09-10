# Backlog

Issues found outside a grain's scope. Recorded, not fixed.

## RESOLVED (grain-6): the browser test project cannot run in this sandbox

Found: 2026-09-10 (grain-3)

`vitest --project app` runs every React test in a real Chromium. In this
environment Chromium fails to launch before any test file is loaded:

    chrome-headless-shell: error while loading shared libraries:
    libatk-1.0.so.0: cannot open shared object file

The system libraries it links against are missing and the sandbox has no root,
so the browser runtime's dependency installer cannot be used either. Reproduced
on an untouched file (`src/components/atomic-crm/root/DemoModeBanner.test.tsx`),
so this is a pre-existing environment failure, not a regression: **every**
`app`-project test is affected, including the ones that passed in earlier
grains.

Verified in grain-3 despite this:

- `columnMapping.test.ts` is pure and was run with browser mode switched off
  (18/18 green).
- `tsc --noEmit` and `eslint` cover the component and test files.

The DOM tests added in grain-3 (`ContactImportDialog.test.tsx`) are unrun here
and must be run on a machine that has the browser's system dependencies
installed.

The same applies to the DOM tests added in grain-4 (three more cases in
`ContactImportDialog.test.tsx`, covering the duplicate-policy choice). The
grain's logic is also covered by two node-runnable suites that were run here
(`import/duplicates.test.ts`, `useContactImport.test.ts` — 40 tests green), so
the browser suite is corroboration, not the only proof.

The same applies to the DOM tests added in grain-5 (two more cases in
`ContactImportDialog.test.tsx`, covering the refused row, its reason line and
the report action). The grain's logic is also covered by node-runnable suites
that were run here (`import/errorReport.test.ts` 18 tests,
`useContactImport.test.ts` 15 tests, `import/duplicates.test.ts` 30 tests — all
green), so the browser suite is corroboration, not the only proof.

**Resolved in grain-6.** The missing libraries are present on this machine, just
not on the loader path: an unpacked copy sits under `/tmp/pwlibs/root/usr/lib64`
and `/tmp/chromelibs/root/usr/lib64`. Pointing the loader at them makes the
browser start with no root and no install:

    export LD_LIBRARY_PATH=/tmp/pwlibs/root/usr/lib64:/tmp/chromelibs/root/usr/lib64
    CI=true npx vitest run --config vitest.config.ts --project app

The whole `app` project was run this way in grain-6: **262 passed, 1 skipped,
27 files**. That covers every DOM test grains 2 to 5 could only reason about,
so the corroboration those grains asked for now exists. The workaround is
environment-specific and deliberately not written into any config: a machine
with the libraries properly installed needs nothing.

## The import wizard has no browser-automation E2E spec

Found: 2026-09-10 (grain-6)

The wizard's end-to-end walk (upload, mapping, preview, summary) is covered by a
journey test in `ContactImportDialog.test.tsx`, which drives the real components
in a real Chromium against a fake data provider. What it does not cover is the
part only a full-stack run can: the real Supabase write path, RLS, and the
wizard reached through the contact list on a real route.

The implementation policy in force for this work prohibits writing or running
browser-automation suites, so the equivalent spec under `e2e/` was deliberately
not written. A follow-up on a machine with the local Supabase stack should add
it, modelled on `e2e/bulkContactTags.spec.ts`.

Updated 2026-09-10 (fix-1): review called this blocking, so the prohibition is
now cited exactly and the environment claim verified — see
`context/decisions/2026-09-10-grain-6-wizard-journey-test.md`
(`.charlie/principal/skills/implement/SKILL.md:64`,
`.charlie/agents/implementer.md:48`; `docker` absent, so no local Supabase).
**Awaiting a human decision**: waive the E2E deliverable for this job, or lift
the prohibition and schedule the spec where the stack runs. Not an implementer's
call either way.

## The preview step lets an empty file through

Found: 2026-09-10 (grain-6)

A CSV with a header row and no data rows previews as "This file has a header row
but no contacts to import", and "Continue" is still offered: the user can map
columns and start an import that writes nothing. Gating the transition is a
state-machine change, which sat outside grain-6's presentational boundary.


## Stopping a running import leaves the user with no summary

Found: 2026-09-10 (grain-1, batch create/update with summary)

`stopImport` calls the parser's `reset()`, which puts the importer back to
`idle`. The wizard's derived step then falls back to `mapping`, so the counters
for the rows that were already written (`outcomes`) disappear from the screen
without ever being shown as a summary.

A user who stops a 10,000-row import after 4,000 rows is told nothing about what
the CRM already wrote, and re-running the file is their only way to find out.

Out of scope here: the fix is a new terminal state ("stopped") in
`useContactImportWizard`'s `toStep`, plus a summary variant that says the run was
interrupted. That is wizard-flow work, not batch create/update work.
