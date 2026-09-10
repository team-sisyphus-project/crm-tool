# The import wizard's end-to-end proof is a browser-mode journey test, not an E2E spec

Date: 2026-09-10
Grain: grain-6 (E2E coverage and wizard polish)

## Context

The wizard is now four steps deep (upload, preview, column mapping, import) with
a summary that can carry failures. Every step has unit and component coverage,
but nothing asserted that a single file can be carried from the first step to
the last — the failure mode a per-step suite is blind to is a broken *transition*.

The obvious home for that proof is `e2e/`, next to `bulkContactTags.spec.ts`:
a browser-automation spec against the running app and a local Supabase stack.

## Decision

The whole-flow proof lives in `ContactImportDialog.test.tsx` as a journey test
("walks a file from the upload step to the summary"), run by the `app` vitest
project — which is itself a real Chromium driving the real components, against a
fake data provider. No spec was added under `e2e/`.

## Why

- The implementation policy in force for this work prohibits writing or running
  browser-automation suites. It is explicit that this holds even when the task
  names an E2E test, and that unit-level coverage is the substitute.
- The `app` project is not a simulated DOM: it renders in Chromium, so the
  journey test exercises the same portals, focus behaviour and Radix widgets an
  E2E spec would. Waits are the locator API's own retries — there is no
  fixed-duration wait anywhere in it.
- An E2E spec here could not have been run: it needs the local Supabase stack
  and the app served on its own port, neither of which exists in this
  environment. A spec that has never once failed is not yet a test.

## What this does not cover, and what was rejected

Rejected: writing the spec under `e2e/` unrun, as documentation of intent. An
unexecuted test is a liability — it rots and no one notices.

The gap is real and recorded in `context/backlog.md`: the real Supabase write
path, RLS, and reaching the wizard through the contact list on a real route are
not covered by the journey test. A follow-up with the stack available should add
the spec, modelled on `e2e/bulkContactTags.spec.ts`.
