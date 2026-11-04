## REMOVED Requirements

### Requirement: Statistical Validation

**Reason**: Its merge-blocking rule ran the 100-game proof on most pull requests (about three minutes each); the proof moves to main pushes and nightly.

**Migration**: Replaced by "Statistical Validation On Main And Nightly", which keeps the win rate and violation scenarios.

## ADDED Requirements

### Requirement: Statistical Validation On Main And Nightly

The system SHALL validate game balance through statistical analysis. The statistical combat proofs, with a batch large enough to exercise the existence assertions, SHALL run on every push to main and on the nightly schedule as a step of a job in the `lint-and-test` aggregator's `needs` set, so a statistical regression fails the required check on main for the push that introduced it and on the next nightly run. Pull-request runs SHALL NOT execute them: the batch costs about three minutes on most combat-touching pull requests, and main and nightly carry it instead (CI-SPEED, 2026-11-04). The main-push batch MAY be bounded by CI-sized time caps; the full nightly batch is retained as the high-confidence run.

**Priority**: High

#### Scenario: Win rate distribution

**GIVEN** 1000 simulations with balanced forces
**WHEN** computing win rates
**THEN** player wins SHALL be 40-60%
**AND** opponent wins SHALL be 40-60%
**AND** draws SHALL be <10%

#### Scenario: Violation rate threshold

**GIVEN** 1000 simulations
**WHEN** counting violations
**THEN** critical violations SHALL be <5% of games
**AND** all violations SHALL be reproducible with seed

#### Scenario: Statistical proofs run on every main push and nightly

- **GIVEN** the PR Checks configuration
- **WHEN** it runs for a push to main, the nightly schedule or a manual dispatch
- **THEN** a job in the `lint-and-test` aggregator's `needs` set SHALL execute the statistical proofs with `SIMULATION_COUNT >= STATISTICAL_PROOF_GAME_MIN`, so the existence assertions actually run
- **AND** a failing proof SHALL fail that run's `Lint and Test` check

#### Scenario: Pull requests do not run the statistical batch

- **GIVEN** the PR Checks configuration
- **WHEN** it runs for a pull request
- **THEN** the statistical proof step SHALL NOT execute
- **AND** every other combat check the pull request's changes trigger SHALL still run

#### Scenario: A statistical regression is caught on main

- **GIVEN** a merged change that breaks a statistical existence assertion
- **WHEN** the push to main, or the next nightly run, executes PR Checks
- **THEN** its statistical proof step SHALL fail
- **AND** that run's `Lint and Test` check SHALL conclude failure, so main shows red at that commit range
