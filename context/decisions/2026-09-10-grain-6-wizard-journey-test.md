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
  browser-automation suites. Cited, because the first version of this record
  asserted the prohibition without saying where it lives, and a reviewer looking
  for it under `.charlie-design-system/policy/**` (the design-system addon) did
  not find it — it is in the core implementation policy, not the addon:
  - `.charlie/principal/skills/implement/SKILL.md:64` — "**E2E/browser
    automation test prohibition.** Do not install, write, or run Playwright,
    Cypress, Selenium, or Puppeteer. Even if DoneWhen mentions 'e2e', substitute
    with unit tests. This is a global prohibition, not scope protection."
  - `.charlie/agents/implementer.md:48` — "**E2E test prohibition**: Do not
    install or run browser automation tools (Playwright, Cypress, Selenium,
    Puppeteer). Do not write E2E tests. This is a boundary violation."
  This is not the same rule as `.claude/rules/validation-commands.md`, which the
  reviewer correctly reads as forbidding only the *running* of the suite. Both
  apply; the implementation policy is the stricter one and it names writing.
- The `app` project is not a simulated DOM: it renders in Chromium, so the
  journey test exercises the same portals, focus behaviour and Radix widgets an
  E2E spec would. Waits are the locator API's own retries — there is no
  fixed-duration wait anywhere in it.
- An E2E spec here could not have been run: it needs the local Supabase stack
  and the app served on its own port, neither of which exists in this
  environment. A spec that has never once failed is not yet a test. Checked
  rather than assumed, in the fix-1 pass: `docker` is not on `PATH` and
  `docker info` fails, so `npx supabase start` cannot bring up the stack that
  `e2e/fixtures.ts` talks to (it opens a service-role client against
  `127.0.0.1:54341` in its `resetDb` fixture, which every spec in that
  directory takes automatically via `{ auto: true }`). Playwright's own runner
  is installed (1.60.0); the database under the app is what is missing.

## What this does not cover, and what was rejected

Rejected: writing the spec under `e2e/` unrun, as documentation of intent. An
unexecuted test is a liability — it rots and no one notices.

The gap is real and recorded in `context/backlog.md`: the real Supabase write
path, RLS, and reaching the wizard through the contact list on a real route are
not covered by the journey test. A follow-up with the stack available should add
the spec, modelled on `e2e/bulkContactTags.spec.ts`.

## Status: this is not settled by this record

Review (fix-1) called the missing `e2e/contactImportWizard.spec.ts` blocking,
resolvable by the deliverable **or an explicit human waiver** — and was right
that an unmet DoneWhen is not the implementer's to sign off. This record does
not sign it off. It documents two facts and stops:

1. Writing the spec is a boundary violation under the implementation policy
   cited above, and boundary compliance is a Definition-of-Done item
   (`ai-protocol.md` §5), so no amount of grain scope makes it available.
2. Even with the prohibition lifted, the spec could not be executed here — no
   Docker, therefore no local Supabase.

Because (1) and (2) point the same way, the fix-1 pass did not write the spec.
The decision that remains is a human's, and it is a choice between exactly two
things: waive the E2E deliverable for this job (the journey test plus the
node-runnable suites are the coverage of record), or lift the prohibition and
schedule the spec on a machine with the stack, where it can actually be run and
seen to fail. Both are open. Neither is chosen here.
