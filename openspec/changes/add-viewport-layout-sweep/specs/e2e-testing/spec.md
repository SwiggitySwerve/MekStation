# e2e-testing Delta — add-viewport-layout-sweep

## ADDED Requirements

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

## MODIFIED Requirements

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
