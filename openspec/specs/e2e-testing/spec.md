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
