# journey-qc Delta — add-seam-trust-anchor-journeys

## MODIFIED Requirements

### Requirement: Playable command screen E2E journeys
Journey QC SHALL include automated E2E journeys for combat command, campaign starmap logistics, mission readiness roster handoff, Mek stable to customizer return, GM intervention redaction, and campaign persistence reload. The mission-readiness roster handoff journey SHALL verify the deployment-validation surface up to and including the enabled launch control; the verification that encounter materialization actually receives the selected campaign roster SHALL be delivered by the roster materialization handoff trust anchor journey (see "Roster Materialization Handoff Trust Anchor Journey"), which crosses the launch boundary that the readiness/customizer journey stops at.

#### Scenario: Combat command journey validates preview and commit
- **WHEN** the combat command E2E journey runs
- **THEN** it SHALL select a unit, preview movement or attack, assert legal/illegal reasons, commit an action, and verify the committed state/log matches the preview

#### Scenario: Campaign logistics journey validates reload truth
- **WHEN** the campaign logistics E2E journey runs
- **THEN** it SHALL preview travel, commit travel, reload the campaign, and assert persisted location, date, finance, activity, and downstream state match the committed preview

#### Scenario: Readiness and customizer journey validates deployment handoff
- **WHEN** the readiness/customizer E2E journey runs
- **THEN** it SHALL select a mission roster, follow a blocker to stable or customizer, return to readiness, refresh validation, and verify the launch control becomes enabled for the selected campaign roster
- **AND** the verification that encounter materialization receives that selected roster SHALL be delivered by the roster materialization handoff trust anchor journey, which continues through the launch click this journey stops before

#### Scenario: GM redaction journey validates player and GM views
- **WHEN** the GM redaction E2E journey runs
- **THEN** it SHALL commit a GM intervention, assert the GM view shows private rationale and full diff, assert the player view shows only public net effect, and repeat after reload

## ADDED Requirements

### Requirement: Seam Trust Anchor Journeys

Journey QC SHALL maintain three named seam trust anchor journeys — recovery rehydration (`e2e/active-session-recovery.spec.ts`), roster materialization handoff (`e2e/seam-roster-materialization-handoff.spec.ts`), and fresh-construction no-instant-defeat (`e2e/seam-fresh-construction-no-instant-defeat.spec.ts`) — as permanent, un-sliced, route-mounted Playwright journeys. Each anchor SHALL enter the application exclusively through a real route mount (`page.goto` against the production route), never through store injection past the seam it guards, and SHALL use hard blocking assertions, never capture-tolerant findings. Scenario packs, headless fast-forward shortcuts, and store-injection fixtures MAY complement the anchors but SHALL NEVER replace them; deleting an anchor, softening one to capture-tolerant mode, or substituting synthetic-entry coverage for one SHALL require an explicit delta to this requirement. Each anchor SHALL be runnable locally through a dedicated `verify:qc` package script at a single worker under the desktop chromium project, SHALL be excluded from the responsive viewport projects via `testIgnore`, SHALL mint unique per-run identifiers for any server-persisted state it creates and delete that state in teardown, and SHALL NOT be added to the required seven-journey scenario catalog (the anchors are Playwright specs, not catalog journeys).

#### Scenario: Anchors are registered and locally runnable
- **WHEN** an operator runs the seam-anchor verify lane (`npm run verify:qc:seam-anchors`)
- **THEN** it SHALL execute the targeted regression jest suites for the guarded seams and all three anchor specs under the chromium project at a single worker

#### Scenario: Anchors are excluded from viewport multiplication
- **WHEN** an operator lists the scheduled tests for any anchor spec (`npx playwright test --list <anchor spec>`)
- **THEN** the anchor's tests SHALL be scheduled only under the desktop chromium project
- **AND** the responsive projects (Mobile Chrome, Tablet Portrait, Tablet Landscape) SHALL NOT schedule any anchor spec
- **AND** anchor specs SHALL NOT carry the `@smoke` tag — the smoke project selects by `grep /@smoke/` on Desktop Chrome, so a tagged anchor would double-schedule and violate the chromium-only clause

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

### Requirement: Recovery Rehydration Trust Anchor Journey

Journey QC SHALL include a recovery rehydration trust anchor journey that seeds the browser IndexedDB match log directly — the `mekstation-match-log` database's `matchEvents` and `matches` stores, with a `GameCreated`-first event stream — and then cold-navigates to `/gameplay/games/:id`, so recovery runs through the production recovery factory chain (`recoverInteractiveSession` → `hydrateRecoverableSessionFromMatchLog` → `fromSessionAsync`) with no prior in-memory session state. The seeded roster SHALL mirror at least one canonical `unitRef` across the player and opponent sides under distinct deployed unit ids, so the journey exercises the recovery-side per-instance id aliasing that a fixture with all-distinct `unitRef`s cannot reach. The journey SHALL hard-assert the recovery invariants below and SHALL re-assert them after a page reload.

#### Scenario: Cold route mount recovers the seeded match
- **GIVEN** a seeded IndexedDB match log for match id M and no prior in-memory gameplay store state
- **WHEN** the browser cold-navigates to `/gameplay/games/M`
- **THEN** the gameplay store SHALL report loading complete with no error
- **AND** the recovered session SHALL have id M and active status, and the interactive session SHALL be non-null

#### Scenario: Mirrored canonical refs survive recovery without id collision
- **GIVEN** a seeded roster where the player and opponent sides share at least one canonical `unitRef` under distinct deployed unit ids
- **WHEN** recovery completes
- **THEN** every deployed unit id in the seeded roster SHALL resolve to a non-null movement capability on the recovered interactive session
- **AND** the recovered state SHALL contain exactly the seeded roster's unit count, with no id-collision collapse
- **AND** a bare canonical `unitRef` shared across sides SHALL NOT itself resolve as a deployed unit id

#### Scenario: Recovery does not manufacture a terminal outcome
- **WHEN** recovery of an active seeded match completes
- **THEN** the recovered session's status SHALL be active, not completed
- **AND** the recovered event stream SHALL contain no terminal-outcome event that the seeded log did not already contain

#### Scenario: Reload re-recovers idempotently
- **WHEN** the recovered page is reloaded
- **THEN** every recovery invariant above SHALL hold again on the re-recovered session

#### Scenario: Seeded recovered continuations are deterministic at the route level
- **GIVEN** a seeded match log whose persisted `config.seed` is a finite number (per the game-engine-orchestration "Recovered Session Dice Re-Seeding" contract)
- **WHEN** the match is recovered twice through two independent cold page loads and each recovered session is driven through an identical short continuation
- **THEN** the two continuations' normalized event streams SHALL be equal to each other
- **AND** the assertion SHALL be run-to-run equality only — no roll value, outcome, or uninterrupted-run claim SHALL be pinned

### Requirement: Roster Materialization Handoff Trust Anchor Journey

Journey QC SHALL include a roster materialization handoff trust anchor journey that click-drives the live campaign path — contract acceptance, mission launch briefing, full roster selection, and the launch click — through encounter materialization into the pre-battle route, and hard-asserts the roster-parity invariants of the campaign-combat-loop "Campaign-Linked Encounter Launch" requirement at the route-mounted layer. The journey SHALL use blocking Playwright assertions, not capture-tolerant findings: a roster collapse (fewer rendered units than selected, or zero battle value) SHALL fail the spec.

#### Scenario: Full roster selection reaches pre-battle intact
- **GIVEN** a live campaign with N ready roster units selected in the mission readiness panel
- **WHEN** the launch control is clicked and the browser lands on the encounter pre-battle route
- **THEN** the pre-battle player unit list SHALL render exactly N units
- **AND** the rendered player force battle value SHALL be greater than zero
- **AND** each rendered player unit row SHALL display the pre-battle pilot-assignment indicator, not a crewless row — the pre-battle roster renders an assignment marker rather than pilot names, so pilot identity itself SHALL be verified at the data layer per the "Force assignments verified at the data layer" scenario, not on this DOM
- **AND** these SHALL be hard assertions that fail the spec on violation, not recorded findings

#### Scenario: Force assignments verified at the data layer
- **WHEN** the journey reads the materialized player force through the live API after launch
- **THEN** the player force SHALL contain exactly N unit assignments with N distinct unit ids and their assigned pilots preserved

#### Scenario: Handoff journey cleans up its materialized rows
- **WHEN** the journey completes, whether passing or failing
- **THEN** its created campaign, forces, and encounter SHALL be deleted through the live API in teardown

### Requirement: Fresh Construction No-Instant-Defeat Trust Anchor Journey

Journey QC SHALL include a fresh-construction trust anchor journey that launches a materialized NvN encounter from the pre-battle route with an explicit `?seed=N` query parameter (per the game-engine-orchestration "Single-Player Launch Seed Threading" contract) and hard-asserts, at the route-mounted layer, the campaign-combat-loop "Launched Campaign Sessions Start Battle-Ready" invariants. The materialized player force SHALL field at least two units sharing one canonical `unitRef`, so the per-instance unit-id construction path is provably exercised regardless of opponent selection. The journey SHALL assert no golden traces: same-seed runs are compared to each other, never to pinned literal values.

#### Scenario: Seeded launch constructs a full battle with distinct unit identities
- **GIVEN** a materialized NvN encounter whose player force fields at least two units sharing one canonical `unitRef`
- **WHEN** the pre-battle route is loaded with `?seed=N` and the battle is launched
- **THEN** the mounted battle SHALL expose 2N distinct per-instance unit identities, counted by distinct unit ids rather than DOM node totals

#### Scenario: Initiative advance does not instant-defeat
- **WHEN** the launched battle advances out of Initiative and through at least two further rounds
- **THEN** no terminal outcome (victory, defeat, or draw) SHALL be presented unless justified by combat, withdrawal, or concession events
- **AND** absent such events, both sides SHALL retain at least one alive unit after each advance

#### Scenario: Same seed twice yields equal outcome markers
- **GIVEN** one materialized encounter
- **WHEN** it is launched twice through two independent page loads with the same `?seed=N` and driven through identical advance sequences
- **THEN** the per-round outcome markers observed on each run (phase, status, alive-unit counts per side) SHALL be equal between the two runs
- **AND** no marker SHALL be compared against a pinned literal value
