# journey-qc Delta — add-viewport-layout-sweep

## MODIFIED Requirements

### Requirement: Seam Trust Anchor Journeys

Journey QC SHALL maintain three named seam trust anchor journeys — recovery rehydration (`e2e/active-session-recovery.spec.ts`), roster materialization handoff (`e2e/seam-roster-materialization-handoff.spec.ts`), and fresh-construction no-instant-defeat (`e2e/seam-fresh-construction-no-instant-defeat.spec.ts`) — as permanent, un-sliced, route-mounted Playwright journeys. Each anchor SHALL enter the application exclusively through a real route mount (`page.goto` against the production route), never through store injection past the seam it guards, and SHALL use hard blocking assertions, never capture-tolerant findings. Scenario packs, headless fast-forward shortcuts, and store-injection fixtures MAY complement the anchors but SHALL NEVER replace them; deleting an anchor, softening one to capture-tolerant mode, or substituting synthetic-entry coverage for one SHALL require an explicit delta to this requirement. Each anchor SHALL be runnable locally through a dedicated `verify:qc` package script at a single worker under the desktop chromium project, SHALL be scheduled under the desktop chromium project only — under any Playwright project topology, no viewport- or touch-emulation project SHALL schedule an anchor spec, whatever mechanism the topology uses for selection (per-project exclusion lists, tag scoping, or match patterns) — SHALL mint unique per-run identifiers for any server-persisted state it creates and delete that state in teardown, and SHALL NOT be added to the required seven-journey scenario catalog (the anchors are Playwright specs, not catalog journeys).

#### Scenario: Anchors are registered and locally runnable
- **WHEN** an operator runs the seam-anchor verify lane (`npm run verify:qc:seam-anchors`)
- **THEN** it SHALL execute the targeted regression jest suites for the guarded seams and all three anchor specs under the chromium project at a single worker

#### Scenario: Anchors are excluded from viewport multiplication
- **WHEN** an operator lists the scheduled tests for any anchor spec (`npx playwright test --list <anchor spec>`)
- **THEN** the anchor's tests SHALL be scheduled only under the desktop chromium project
- **AND** no other registered project SHALL schedule any anchor spec — under the tag-then-scope topology, anchor specs SHALL NOT carry the `@mobile-touch` tag or any other project-selecting tag
- **AND** anchor specs SHALL NOT carry a tag that any grep-scoped project selects by (historically `@smoke`, while a grep-scoped smoke project existed) — a tag-selected anchor would double-schedule and violate the chromium-only clause

#### Scenario: Packs and shortcuts never displace an anchor
- **WHEN** a scenario pack, headless fast-forward path, or store-injection fixture covers surface overlapping a seam trust anchor
- **THEN** the anchor SHALL remain in the suite with its hard assertions intact
- **AND** any proposal to remove or soften an anchor SHALL be expressed as a delta to this requirement, never as a silent spec deletion

#### Scenario: Anchors isolate their persisted state
- **WHEN** an anchor creates campaigns, forces, or encounters through the live API
- **THEN** it SHALL name that state with unique per-run identifiers
- **AND** it SHALL delete the created campaigns, forces, and encounters in teardown so repeated and parallel runs do not collide

#### Scenario: Anchor stability is proven by repetition
- **WHEN** an anchor spec is added or modified
- **THEN** the change SHALL include evidence of three consecutive green local runs of that spec under the desktop chromium project at a single worker
