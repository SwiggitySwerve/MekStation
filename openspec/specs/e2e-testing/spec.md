# Capability: e2e-testing

End-to-end Playwright validation coverage for the MekStation platform — covers subsystem validation, smoke specs, regression assertions, and the test-data seeding infrastructure that supports them.

## Purpose

End-to-end Playwright validation coverage for the MekStation platform — covers subsystem validation, smoke specs, regression assertions, and the test-data seeding infrastructure that supports them. Every shipped subsystem MUST have a corresponding spec; coverage gaps fail the CI gate.
## Requirements
### Requirement: Subsystem Validation Coverage

The system SHALL ensure that every shipped MekHQ-equivalent campaign subsystem has end-to-end test coverage validating its primary user-observable behavior — not merely that its page mounts without console errors. Each subsystem MUST have a Playwright spec exercising its primary action (for write-capable subsystems) or asserting its primary output renders after seeded state (for read-only subsystems).

A validation spec SHALL NOT use a conditional `test.skip`-on-missing-data guard in place of seeding: any spec that depends on fixture data MUST seed that data so its assertions execute unconditionally in a clean CI database, rather than vacuously passing when the data is absent.

**Priority**: High

#### Scenario: Every shipped subsystem has a validation spec

**GIVEN** the set of 19 MekHQ-equivalent campaign subsystems shipped in Wave 4 + Wave 6.1 (hiring, XP/leveling, medical, salvage, repair, refit, loans, contract market, contract negotiation, faction reputation, random events, morale, force hierarchy, turnover, aging, awards, rank+pay, unit market, maintenance)
**WHEN** the test suite runs
**THEN** the system SHALL execute exactly 19 specs at `e2e/playtest-subsystem-*.spec.ts`, one per subsystem
**AND** each spec SHALL either (a) drive the subsystem's primary action and assert observable state change, or (b) seed input state and assert the subsystem's output renders with the expected testids
**AND** the CI gate MUST fail if any spec is missing for a shipped subsystem

#### Scenario: Each subsystem UI exposes testid coverage

**GIVEN** a subsystem with a UI surface (page or panel)
**WHEN** a developer inspects the rendered DOM
**THEN** the surface SHALL expose `data-testid` attributes on (a) the primary action element (button / form), (b) the primary output element (list / card / grid), and (c) one root element identifying the surface
**AND** the testid naming convention SHALL match the pattern `{subsystem-noun}-{role}` where `role` is one of `panel|grid|list|row-{id}|button|input-{field}|submit|result|badge`
**AND** the subsystem-validation spec SHALL select against these testids rather than text content

#### Scenario: Write-capable subsystems exercise the primary action

**GIVEN** a write-capable subsystem (hiring, loans, contract market accept, salvage accept, repair reorder, refit commit, rank promote, unit market purchase)
**WHEN** its validation spec runs
**THEN** the spec SHALL drive the primary action via testid-targeted clicks/fills
**AND** assert at minimum: (a) the action's UI feedback (success badge, panel close, ledger entry), (b) the action's store-state mutation (read via `window.__stores__.<store>.getState()`), and (c) any cross-subsystem propagation (e.g. hiring debits ledger, refit changes mech bay state)

#### Scenario: Read-only subsystems exercise the output

**GIVEN** a read-only subsystem (medical recovery countdown, morale state badge, faction standing, awards list, pilot age, random events log, maintenance check log, force tree, turnover departure log)
**WHEN** its validation spec runs
**THEN** the spec SHALL seed the relevant store slice via the `e2e/helpers/campaignSeeders.ts` helpers
**AND** assert the surface renders the seeded data with the expected values, testids, and counts

#### Scenario: Audit matrix is checked in as evidence

**GIVEN** the change ships
**WHEN** a future engineer asks "which subsystems have working specs"
**THEN** `playtest/phase-6/SUBSYSTEM_UI_AUDIT.md` SHALL contain the per-subsystem coverage table including: subsystem name, UI page route, UI component file path, primary action wired (yes/partial/no), output visible (yes/partial/no), best selector, and viability rating (STRAIGHTFORWARD / NEEDS-SETUP / BLOCKED)
**AND** the matrix SHALL be updated when subsystems gain or lose UI coverage

#### Scenario: Conditional skip-on-missing-data is forbidden in place of seeding

**GIVEN** a validation spec whose assertions require fixture data
**WHEN** the spec runs in a clean CI database with no pre-existing data
**THEN** the spec SHALL seed the required fixture before navigating, so the data-dependent assertions always execute
**AND** the spec SHALL NOT contain a `test.skip(<dataCount> === 0, ...)` guard that lets it pass without exercising the behavior it names
**AND** a reviewer SHALL be able to distinguish a genuinely-asserting spec from a vacuously-passing one by the absence of such a guard

### Requirement: Seeded Navigation Assertion Fixtures

The e2e suite SHALL provide reusable seeding helpers that guarantee the precondition data each navigation/read-only spec depends on, so navigation assertions run unconditionally rather than being gated behind data presence.

#### Scenario: Pilot fixture seeds the Career History navigation spec

- **GIVEN** the `e2e/replay-player.spec.ts` Career History navigation spec
- **WHEN** the spec begins
- **THEN** a seeding helper in `e2e/helpers/campaignSeeders.ts` or a sibling pilot/replay seeder SHALL have created at least one pilot so the pilot list is non-empty
- **AND** the spec SHALL click the first pilot, open the Career History tab, and assert the tab and its seeded values render with no `test.skip` short-circuit
- **AND** removing the seeder SHALL cause the spec to fail rather than pass.

#### Scenario: Seeded read-only specs assert values, not mere presence

- **GIVEN** a read-only navigation spec backed by a seeding helper
- **WHEN** the spec asserts the rendered surface
- **THEN** it SHALL assert against the specific seeded values and counts, not only that an element exists
- **AND** a seeder that produces empty or placeholder data SHALL NOT satisfy the assertion.

### Requirement: Networked Multiplayer Journey Coverage Honesty

The e2e suite SHALL represent the networked-multiplayer player-journey coverage status honestly: a multi-peer journey test SHALL either assert real behavior or be marked as an explicit, enumerated deferral tied to a named follow-up, never a silent empty `test.skip` body that resembles coverage while asserting nothing.

#### Scenario: Multi-peer journey specs are wired or explicitly deferred

- **GIVEN** the multi-peer flow specs in `e2e/p2p-sync.spec.ts`
- **WHEN** the suite reports coverage for the networked-multiplayer journey
- **THEN** each multi-peer spec SHALL either drive a real two-peer connect/sync assertion through the e2e harness
- **OR** be converted to an explicit `test.fixme` annotated with the owning follow-up, so the deferral is visible and counted
- **AND** an empty `test.skip` body that performs no assertion SHALL NOT remain in the suite.

### Requirement: PR-Gated Coverage Floor

The CI configuration SHALL enforce a minimum code-coverage floor for the combat and simulation source trees on every pull request, so coverage can rise but cannot silently erode.

#### Scenario: Coverage below the pinned floor fails a PR

- **GIVEN** a pull request that lowers measured coverage of `src/utils/gameplay/**` or `src/simulation/**` below the pinned floor
- **WHEN** the PR CI checks run
- **THEN** a blocking coverage job SHALL fail the PR
- **AND** the floor SHALL be initialized at or below the coverage measured at change time so it does not red-gate on merge, and SHALL be raisable over time but not silently lowerable.

#### Scenario: Coverage gate runs in the blocking PR lane

- **GIVEN** the coverage gate
- **WHEN** the `lint-and-test` aggregator evaluates its dependencies
- **THEN** the coverage job SHALL be a member of the aggregator's required `needs` set
- **AND** a coverage regression SHALL therefore fail the branch-protection required check, not only a non-gating nightly run.

### Requirement: Journey-Level Automated QC
The E2E testing system SHALL include journey-level automated QC commands for character build, Mek build, 1v1 combat, 4v4 combat, contract campaign scenario, short campaign, and long campaign validation. These commands MUST complement existing page and subsystem tests.

#### Scenario: All journeys can run from one command
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=all --tier=standard`
- **THEN** the test system executes the standard-tier journey set and writes a result for each required journey

### Requirement: Headless, Browser, and Hybrid Modes
The E2E testing system SHALL support headless, browser, and hybrid journey execution modes. Browser and hybrid modes MUST capture page errors, critical console errors, screenshots or traces when configured, and visible completion evidence for UI-driven steps.

#### Scenario: Browser mode captures page errors
- **WHEN** a browser-mode journey encounters an uncaught page error
- **THEN** the journey result records the error and produces a bug candidate linked to the browser artifact

### Requirement: Journey Repeatability Controls
Journey-level tests SHALL expose repeatability controls for seed, run count, generated input preservation, and output directory. The test system MUST record these controls in the run plan and result.

#### Scenario: Run count executes repeated validation
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=combat-1v1 --runs=3 --seed=42`
- **THEN** the result contains three combat journey attempts tied to the same resolved configuration

### Requirement: Standard and Extended Validation Tiers
The E2E testing system SHALL distinguish standard validation from extended validation. Standard-tier journeys MUST be suitable for routine local validation, while extended-tier journeys MAY run longer campaign lengths or broader generated input matrices.

#### Scenario: Long campaign can run extended contracts
- **WHEN** the user runs `npm.cmd run qc:journeys -- --journey=campaign-long --tier=extended --contracts=10`
- **THEN** the test system executes a long campaign plan with ten generated contracts or records an explicit gap for any unsupported step

### Requirement: Journey Evidence Gate
Journey-level tests SHALL fail when required evidence is missing, when a terminal state is absent, when generated steps are not executed, or when bug severity exceeds the configured gate.

#### Scenario: Missing terminal state fails journey
- **WHEN** a combat journey produces generated inputs but no combat terminal state
- **THEN** the journey result is failed and the bug extractor records a missing-terminal-state bug candidate

### Requirement: UI and Domain Agreement Checks
Journey-level tests SHALL verify agreement between UI-visible state and domain results when a journey uses browser or hybrid mode. Combat journeys MUST compare preview or runner output with the resolved engine outcome when both surfaces are available.

#### Scenario: Hybrid combat result agrees with engine
- **WHEN** a hybrid combat journey previews and resolves an attack
- **THEN** the test records whether the previewed legality, range, targetability, and terminal resolution agree with the engine output

### Requirement: Two-Browser Co-op Campaign Continuity Journey

The system SHALL provide a Playwright end-to-end spec that proves live co-op campaign play across **two real browser contexts** (a host context and a guest context), modeled on the existing two-context pattern in `e2e/multiplayer-live-vault-auth.spec.ts`. The spec SHALL be runnable via a dedicated `verify:qc:coop-campaign-journey` npm script, SHALL run green locally against the `server.js` WebSocket transport booted by the Playwright `webServer` config, and SHALL cover the co-op campaign flow from host creation through post-battle propagation and reload. Any step that remains blocked by a transport limitation the wave could not close SHALL be asserted at the maximum honestly provable point and its residual filed as an explicit follow-up, never faked by reaching into both pages' JS heaps to bridge them.

#### Scenario: Host creates and guest joins a co-op campaign by room code

- **GIVEN** a host browser context and a guest browser context with distinct vault identities
- **WHEN** the host creates a co-op campaign from the UI and the guest joins with the host's room code
- **THEN** the host SHALL land on the campaign dashboard with the `Co-op session: Host` badge
- **AND** the guest SHALL land on the campaign dashboard with the `Co-op session: Guest` badge
- **AND** the guest dashboard SHALL display the host's campaign state (funds and roster) rather than an empty campaign

#### Scenario: Both sides converge on shared campaign state

- **GIVEN** a host and a guest joined to the same co-op campaign
- **WHEN** the host commits a campaign mutation that the flow exercises
- **THEN** the guest mirror SHALL reflect the mutation over the transport
- **AND** the guest's displayed state SHALL match the host's for the mutated value

#### Scenario: Mission launch, participation, and outcome propagate to both sides

- **GIVEN** a co-op campaign with a launchable mission
- **WHEN** the host selects or creates the encounter, both players choose participation, and the encounter resolves
- **THEN** the launch gate SHALL enable only after both participation choices converge
- **AND** the resolved outcome SHALL reconcile into the host's campaign
- **AND** the reconciled post-battle campaign events SHALL propagate to the guest mirror

#### Scenario: Reload preserves the public/private authority split

- **GIVEN** a guest with synced co-op campaign state
- **WHEN** the guest reloads
- **THEN** the guest SHALL re-hydrate its mirror from the host over the transport
- **AND** GM-private host controls and data SHALL remain hidden from the guest after reload
- **AND** the guest's public campaign state SHALL remain consistent with the host's

### Requirement: Co-op Campaign Journey UI Audit Coverage

The system SHALL run a UI audit pass over the exact co-op campaign flow set exercised by the two-browser journey, following the repo's existing UX-audit / command-evidence harness pattern (`qc:ux-audit`, `qc:command-evidence`). The audit SHALL capture per-flow evidence and assert, for each audited co-op surface: screen fit (no overflow/clipping at the target viewport), clickability (interactive controls are reachable and enabled when their action is available), private/public visibility (guest surfaces omit GM-private controls and data), and action completion (each primary co-op action reaches a resolved terminal state, not a silent no-op).

#### Scenario: Co-op flow set produces an evidence bundle

- **WHEN** the co-op campaign UI audit runs
- **THEN** it SHALL produce a per-run evidence bundle for the audited co-op surfaces (create, join, dashboard host, dashboard guest, mission launch)
- **AND** the audit SHALL fail if any audited surface has a screen-fit, clickability, visibility, or action-completion violation

#### Scenario: Guest surfaces pass the private/public visibility check

- **WHEN** the audit inspects the guest-mode co-op surfaces
- **THEN** GM-private controls and data SHALL be absent from the captured guest evidence
- **AND** the guest public campaign projection SHALL be present

### Requirement: Deep-Play Harness Rate-Limit Isolation

The API rate limiter SHALL be bypassed when — and only when — the process is running under the Playwright e2e harness, identified by the environment pair `NEXT_PUBLIC_E2E_MODE === 'true'` AND a set `PLAYWRIGHT_E2E_RUN_ID` (the pair the Playwright `webServer` config sets and nothing else sets). This isolation SHALL apply uniformly to every rate-limited route (token mint, match create, vault unlock) so back-to-back deep-play runs sharing one dev-server process and one client IP do not flap on HTTP 429. The bypass SHALL NOT engage in production, in a manually-started dev server, or in jest unit suites that assert real 429 behavior; if the jest environment can set the harness env pair, the bypass predicate SHALL additionally require the absence of a jest worker so those suites still exercise the limiter.

#### Scenario: Back-to-back harness runs do not flap on 429

- **GIVEN** the Playwright webServer running with `NEXT_PUBLIC_E2E_MODE='true'` and `PLAYWRIGHT_E2E_RUN_ID` set
- **WHEN** the deep-play journeys mint auth tokens, create matches, and unlock the vault more times than the standing 5-per-60s cap within one window across two consecutive runs
- **THEN** the rate limiter SHALL not reject any of those requests with HTTP 429
- **AND** the `"Lobby token mint failed with HTTP 429"` journey error SHALL NOT occur

#### Scenario: Production and manual dev servers keep the limiter

- **GIVEN** a process without both harness environment variables set (production, or a manually-started dev server)
- **WHEN** a rate-limited route receives more requests than the configured cap within the window
- **THEN** the limiter SHALL reject the excess with HTTP 429 and a `Retry-After` header exactly as before

#### Scenario: 429-asserting jest suites still exercise the limiter

- **GIVEN** a jest suite that asserts the limiter returns HTTP 429 when the cap is exceeded
- **WHEN** the suite runs
- **THEN** the bypass SHALL NOT disable the limiter for that suite
- **AND** the 429 assertions SHALL execute against the real limiter rather than passing vacuously

### Requirement: Deep-Play Playwright Project Scoping

The UX deep-play and UX-walkthrough audit specs SHALL be scheduled under exactly one desktop project (chromium) regardless of how Playwright is invoked, so a bare `npx playwright test` does not fan them out across additional projects and force multiple copies to contend for the single shared webServer, the single durable SQLite pair, and the single IP-keyed rate bucket. Under the tag-then-scope project topology this SHALL hold by construction: no viewport-duplicate project exists to re-schedule them, the tag-scoped mobile-touch project's selection SHALL NOT match them (they SHALL NOT carry the mobile-touch tag), and any future project addition SHALL preserve their single-desktop-project scheduling. In-spec browser-name skips SHALL NOT be the scoping mechanism, because every configured project uses the same Chrome engine and cannot be distinguished by browser name.

#### Scenario: Deep-play spec runs only under the desktop project

- **WHEN** an operator runs `npx playwright test --list e2e/ux-deep-play-audit.spec.ts`
- **THEN** the listed tests SHALL be scheduled only under the chromium project
- **AND** no other registered project SHALL schedule the deep-play or UX-walkthrough specs

#### Scenario: Scripted entry points are unaffected

- **GIVEN** the scripted runners and CI already pass `--project=chromium`
- **WHEN** the walkthrough runner or a `verify:`/`qc:` script executes the deep-play or walkthrough specs
- **THEN** those runs SHALL continue to execute under chromium exactly as before, with no change to their scheduled test set

### Requirement: Shared Layout Assertion Helpers

The e2e suite SHALL provide a shared layout assertion module at `e2e/helpers/layout.ts` as the single source for structural layout checks: a horizontal-overflow assertion (document scroll width within one pixel of the window inner width, with offending elements named in the failure), a clickability assertion (visible, enabled, in viewport, bounding box at least 32×32 pixels), a non-blank-render assertion that accepts the target locator as an argument and asserts pixel-level color and contrast diversity on that locator's screenshot, and an element-overlap assertion that asserts pairwise axis-aligned bounding-box disjointness among a declared set of sibling check targets — excluding ancestor-descendant pairs structurally, applying a small pixel tolerance, and honoring an explicit, reviewable allowlist for overlap-by-design pairs; an overlap failure SHALL name both elements and their boxes. A declared check target that resolves to no visible element SHALL fail the overlap and clickability assertions naming the missing target — the helpers SHALL NOT silently filter invisible targets, and excluding a target at a given viewport SHALL be expressed as the consuming inventory's viewport-applicability data, never as a helper-side visibility filter. The module SHALL also export the canonical sweep viewport list, whose tablet, laptop, and desktop widths are imported from the canonical breakpoint constants in `src/constants/layout.ts` (never copied as literals) and whose 375-pixel mobile width is a documented device-width literal that intentionally has no breakpoint counterpart. Specs SHALL NOT define local copies of these assertions: existing spec-local implementations SHALL be replaced by imports from the shared module. Helper correctness SHALL be proven by a self-test spec exercising synthetic DOM fixtures for true positives, containment, tolerance-adjacent, and allowlisted cases — the overlap assertion's false-positive discipline is part of the contract, and widening a tolerance or allowlist inside the helper to quiet a failure SHALL NOT occur; overlap-by-design exemptions live in the consuming inventory's allowlist data where review can see them.

#### Scenario: One definition per assertion

- **WHEN** the repository is searched for the layout assertion implementations
- **THEN** each assertion SHALL be defined exactly once, in the shared layout module
- **AND** the specs that previously carried local copies SHALL import the shared implementations and keep passing with unchanged assertion behavior

#### Scenario: The non-blank-render assertion targets a caller-supplied locator

- **WHEN** a spec asserts non-blank rendering of a canvas-bearing surface
- **THEN** it SHALL pass the target locator to the shared assertion
- **AND** the assertion SHALL NOT hardcode any screen-specific test id

#### Scenario: Overlap true positives are caught and named

- **GIVEN** the helper self-test's synthetic fixture with two overlapping positioned siblings
- **WHEN** the overlap assertion runs against them
- **THEN** it SHALL fail naming both elements and their bounding boxes

#### Scenario: Containment and allowlisted pairs are not overlap

- **GIVEN** an ancestor-descendant pair, a pair abutting within the pixel tolerance, or a pair present in the declared allowlist
- **WHEN** the overlap assertion runs
- **THEN** none of them SHALL be reported as a violation

#### Scenario: A declared target that resolves to nothing fails loud

- **GIVEN** a check target passed to the overlap or clickability assertion that resolves to no visible element
- **WHEN** the assertion runs
- **THEN** it SHALL fail naming the missing target
- **AND** it SHALL NOT silently drop the target from the checked set

#### Scenario: Sweep viewport widths bind to the canonical breakpoints

- **WHEN** the sweep viewport list is inspected
- **THEN** its tablet, laptop, and desktop widths SHALL be imported from the canonical breakpoint constants
- **AND** the mobile width SHALL be the documented 375-pixel device literal, matching the established flow-audit viewport-preset precedent

### Requirement: Viewport Layout Sweep

The e2e suite SHALL include a viewport layout sweep — a single spec scheduled under the desktop chromium project — that asserts the shared layout invariants (no horizontal overflow; the viewport-applicable declared check targets non-overlapping; a viewport-applicable primary affordance clickable; non-blank render where a canvas surface is declared) for every swept screen at each of the four canonical sweep viewports, by navigating to the screen and looping the viewport size within the test. Check targets SHALL carry per-viewport applicability: the inventory MAY declare distinct targets per sweep viewport or restrict a target to a subset of the sweep viewports, every swept screen SHALL declare at least one applicable primary affordance for each of the four sweep viewports (the elements MAY differ across viewports — a mobile navigation trigger MAY stand in below the breakpoint where the desktop navigation is hidden by design), and at each viewport the sweep SHALL assert exactly the targets applicable there: an applicable target that resolves to no visible element SHALL fail the screen's test naming the target and the viewport, and the sweep SHALL NOT filter targets by runtime visibility. Responsive collapse the application performs by design SHALL be expressed as inventory applicability data, never as a quarantine entry — quarantine SHALL be reserved for violations. State-conditional affordance alternatives (an empty state versus populated content) SHALL NOT be default check targets: the default check-target set is the route's unconditional affordance set, and a state-conditional target SHALL be declared explicitly naming the state the swept screen is deterministically in. Sweep coverage SHALL be driven by a checked-in screen inventory derived from the app-shell route manifest — never a forked route list — that classifies every manifest route as swept-standalone, swept-static-catalog, pack-seeded, or excluded-with-documented-reason; a guard check SHALL fail when any manifest route lacks a classification, any exclusion lacks a reason, or any swept screen lacks an applicable primary affordance at any sweep viewport, so the inventory cannot silently omit routes or coverage as the app grows. Pack-seeded screens SHALL obtain their state exclusively through the scenario-pack front-door loaders once those exist, and SHALL NOT be swept before then: the sweep SHALL NOT contain a runtime skip-on-missing-dependency guard (per this capability's conditional-skip prohibition) — an un-landed dependency keeps those entries visibly classified as pack-seeded and un-swept in the inventory instead. The dynamic route segments a pack-seeded navigation needs SHALL be sourced from front-door observables only — the loader's post-navigation URL or in-page navigation from an already-mounted pack-seeded screen — never from pack payload internals or uncontracted loader-implementation surfaces; a route whose required state or identifiers no pack contract promises SHALL be classified excluded-with-documented-reason rather than reached through a substitute mechanism. A screen whose route mount requires state SHALL NOT be reached by store injection or hand-seeded rows. Pre-existing violations discovered when sweep coverage is first authored MAY be quarantined per screen, viewport, and check, each with a documented reason and follow-up reference; a quarantine entry without both SHALL fail the guard check, and quarantining a newly-introduced regression after the sweep is landed SHALL require naming the regression it grandfathers. The sweep SHALL assert DOM-geometry invariants only: screenshot or pixel-diff comparison per screen-and-width SHALL NOT be used. The sweep SHALL be runnable locally through a dedicated verify script at a single worker under the chromium project, and SHALL NOT be wired into pull-request gating; promoting it into a PR gate SHALL require a delta to this requirement.

#### Scenario: Every route is classified or the guard fails

- **GIVEN** a route present in the app-shell route manifest but absent from the screen inventory's classifications
- **WHEN** the inventory guard check runs
- **THEN** it SHALL fail naming the unclassified route

#### Scenario: A layout regression fails the sweep naming its coordinates

- **GIVEN** a swept screen that horizontally overflows at the 375-pixel viewport
- **WHEN** the sweep runs
- **THEN** the screen's test SHALL fail identifying the screen, the viewport, and the offending elements

#### Scenario: Responsive collapse is applicability data, not quarantine

- **GIVEN** a screen whose desktop navigation is hidden by design below a breakpoint, with a mobile menu trigger standing in
- **WHEN** the sweep asserts clickability at the mobile viewport
- **THEN** it SHALL assert the mobile-applicable affordance declared in the inventory
- **AND** the hidden desktop affordance SHALL be declared inapplicable at that viewport in the inventory, with no quarantine entry recorded for the by-design collapse

#### Scenario: An applicable target hidden at its viewport fails the sweep

- **GIVEN** a check target declared applicable at a sweep viewport
- **WHEN** the sweep runs and the target resolves to no visible element at that viewport
- **THEN** the screen's test SHALL fail naming the target and the viewport
- **AND** the sweep SHALL NOT silently skip the target

#### Scenario: Dynamic segments come from front-door observables

- **GIVEN** a pack-seeded route pattern requiring an identifier in its path
- **WHEN** the sweep navigates to it
- **THEN** the identifier SHALL come from the loader's post-navigation URL or from clicking an affordance on an already-mounted pack-seeded screen
- **AND** identifiers SHALL NOT be constructed from pack payload contents or loader implementation internals

#### Scenario: The sweep is scheduled under chromium only

- **WHEN** an operator lists the scheduled tests for the sweep spec
- **THEN** its tests SHALL be scheduled only under the desktop chromium project
- **AND** the sweep SHALL NOT carry any project-selecting tag

#### Scenario: Pack-gated screens wait for the front-door loaders

- **GIVEN** the scenario-pack loaders or pilot packs are absent from the tree
- **WHEN** the sweep spec's coverage is inspected
- **THEN** the pack-seeded screens SHALL NOT be swept and SHALL NOT be reached through store injection, hand-seeded rows, or a substitute loader
- **AND** their inventory entries SHALL remain visibly classified as pack-seeded rather than silently skipped at runtime

#### Scenario: Quarantine is documented or rejected

- **GIVEN** a quarantine entry lacking a reason or a follow-up reference
- **WHEN** the inventory guard check runs
- **THEN** it SHALL fail naming the incomplete entry

#### Scenario: No pixel-diff transport

- **WHEN** the sweep's assertions are reviewed
- **THEN** no assertion SHALL compare screenshots or pixel baselines per screen and width
- **AND** the non-blank-render check SHALL remain a color/contrast-diversity invariant on a declared canvas locator, not an image comparison

### Requirement: Playwright Project Topology — Tag-Then-Scope

The Playwright configuration SHALL NOT schedule the same spec set across multiple viewport-cloned projects. The default project set SHALL consist of the desktop chromium project, a thin tag-scoped mobile-touch project, and the environment-gated flow-audit project; viewport coverage SHALL be expressed as a parameter dimension inside specs (viewport-loop fixtures, per-describe context overrides, per-context options), never by re-running the suite under additional viewport projects. The mobile-touch project SHALL select exclusively by an explicit title tag (`@mobile-touch`) and SHALL provide touch emulation defaults (375×667 viewport, touch enabled, mobile mode) for specs that opt in; specs that self-configure touch or viewport through their own context overrides remain valid without the tag. Specs bound to chromium-only scheduling contracts — the seam trust anchor journeys, the deep-play and UX-walkthrough audit specs, the viewport layout sweep, and scenario-pack specs — SHALL NOT carry the mobile-touch tag or any other project-selecting tag. Any change to the project topology SHALL prove, before merge: that the effective test selection of every CI workflow and scripted runner is unchanged — every project reference in workflows, package scripts, and QC runners resolves to a registered project whose scheduled set for that invocation is unchanged — and SHALL record before-and-after scheduled-test counts for the default run and each registered project. Removing the viewport-duplicate projects SHALL NOT remove tag vocabulary: title tags (such as `@smoke`) remain valid grep targets for scoped invocations under the chromium project.

#### Scenario: A bare run schedules each spec at most once outside explicit opt-ins

- **WHEN** an operator runs the suite with no project filter
- **THEN** every scheduled test SHALL belong to the chromium project, the mobile-touch tag opt-in set, or the environment-gated flow-audit project when its gate variable is set
- **AND** no project SHALL re-run the full suite at an alternate viewport

#### Scenario: Topology changes carry selection-unchanged proofs

- **WHEN** a change edits the Playwright project set
- **THEN** it SHALL record before-and-after scheduled-count listings for the default run and each project
- **AND** it SHALL record a consumer audit proving every project reference in CI workflows, package scripts, and QC runner scripts still resolves with an unchanged effective selection

#### Scenario: Touch coverage is opt-in, not suite-wide

- **GIVEN** a spec block that requires project-level touch emulation
- **WHEN** it opts in via the mobile-touch tag
- **THEN** the mobile-touch project SHALL schedule exactly the tagged tests and nothing else
- **AND** chromium-contract specs SHALL NOT carry the tag

#### Scenario: Smoke selection survives the smoke project's removal

- **WHEN** an operator needs the smoke subset
- **THEN** invoking the chromium project with a smoke-tag grep SHALL reproduce the selection
- **AND** no CI workflow or script SHALL be broken by the smoke project's absence, since none referenced it by name

