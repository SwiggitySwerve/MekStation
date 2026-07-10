# Proposal: add-flow-audit-routines

## Why

Agents and humans have no way to invoke a targeted, user-facing audit of one specified flow and inspect the evidence locally at each point along it. Today the choices are the monolithic `qc:ux-audit` (10 mixed-subsystem journeys, selectable only via a `-g` title regex, fixed viewports) or fully headless jest suites — good for CI authority, useless for "drive the app to *this* point in *this* flow and let me look at it." The 2026-07-09 council decision (`openspec/council-decisions/2026-07-09-ui-audit-testability-architecture.md`) settled the architecture split — interactive route-mounted audits for iteration evidence, headless invariants as permanent CI authority — but that split exists only as a decision doc. This change codifies the user-facing half as a spec-backed capability.

## What Changes

- **Flow registry**: a typed manifest of named flows, each an ordered list of checkpoints (flow-meaningful boundaries: "wizard complete", "contract accepted", "pre-battle roster", "first attack resolved", …) tagged with subsystem(s) and supported viewports. Initial set covers all six subsystems: campaign creation→launch, battle turn loop, economy (contract→ledger), maintenance (repair cycle), personnel (hiring), experience (pilot XP).
- **Flow-audit runner** (`npm run qc:flow -- <flow-id>`): drives the named flow in a real browser against the dev server and writes a per-run local evidence catalog (per-checkpoint full-page screenshot, route, console/page errors, timing, index.html contact sheet) — reusing the existing `WalkthroughRecorder` + run-catalog machinery, not a fourth harness.
  - `--list` enumerates flows and their checkpoints.
  - `--until <checkpoint>` stops the flow at that checkpoint, leaving the app state in place.
  - `--hold` (with or without `--until`) targets the developer's running dev server and, after driving to the stop point, prints the live URL + entity ids so an agent or human can open the app locally in exactly that state.
  - `--viewport <preset|WxH>` runs the same flow at a chosen size (mobile/tablet/desktop presets from the canonical breakpoints).
- **Authority split codified in specs**: flow-audit routines are iteration/evidence tooling — they never gate CI. CI authority remains with assertion-based suites (and, per the council ladder, the future headless invariant nets). Flow audits may be scheduled into nightly evidence lanes but must not become PR-blocking.
- **Agent affordance**: runner output ends with a machine-readable summary (catalog path, per-checkpoint status, hold URL when applicable) so an agent can invoke a routine, then read/screenshot-review the results locally.

## Capabilities

### New Capabilities
- `flow-audit-routines`: user-facing, agent-invocable audit routines over named flows — flow registry, checkpoint capture, until/hold semantics, viewport selection, local evidence catalog contract, and the no-CI-gating authority rule.

### Modified Capabilities
- `journey-qc`: add requirements that (a) the walkthrough evidence machinery (recorder, per-run catalog, REVIEW skeleton) is invocable per named flow with checkpoint granularity — not only through the all-journeys umbrella; (b) the harness documents the authority split: interactive walkthrough/flow output is review evidence, never a CI gate; headless assertion suites remain the source of permanent authority for CI.

## Impact

- **New**: `scripts/qc/run-flow-audit.mjs` (runner; delegates to `scripts/playwright/run-playwright.mjs`), flow manifest module (e.g. `e2e/flows/manifest.ts`), flow spec file(s) under `e2e/` mapping checkpoints onto existing journey step sequences, `qc:flow` package.json script.
- **Modified**: `e2e/helpers/uxWalkthrough.ts` (checkpoint annotation + machine-readable run summary), possibly `playwright.config.ts` (reuseExistingServer path for `--hold` mode against a developer dev server).
- **Specs**: new `openspec/specs/flow-audit-routines/spec.md`; delta to `openspec/specs/journey-qc/spec.md`.
- **Unaffected**: CI workflows (explicit non-goal), Playwright project matrix, scenario packs / fast-forward API / SP determinism (council waves W1, W3, W4 — separate changes), existing 10 ux-audit journeys (remain the umbrella run).

## Non-goals

- No CI wiring changes; flow audits gate nothing (council wave W6 handles lanes/gates).
- No scenario-pack state injection — flows reach checkpoints by driving the real UI; pack-accelerated entry arrives with wave W4 and can later be slotted in as a flow prelude.
- No new Playwright viewport projects and no screenshot-diff baselines.
- No headless mode for these routines — headless coverage lives in the existing jest/integration suites and the future fast-forward invariants (wave W3), which remain the CI authority.
