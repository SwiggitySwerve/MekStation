# Capability: e2e-testing

End-to-end Playwright validation coverage for the MekStation platform — covers subsystem validation, smoke specs, regression assertions, and the test-data seeding infrastructure that supports them.

## Requirements

### Requirement: Subsystem Validation Coverage

The system SHALL ensure that every shipped MekHQ-equivalent campaign subsystem has end-to-end test coverage validating its primary user-observable behavior — not merely that its page mounts without console errors. Each subsystem MUST have a Playwright spec exercising its primary action (for write-capable subsystems) or asserting its primary output renders after seeded state (for read-only subsystems).

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
