# Backlog

Issues found outside a grain's scope. Recorded, not fixed.

## Pre-existing: the browser test project cannot run in this sandbox

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
