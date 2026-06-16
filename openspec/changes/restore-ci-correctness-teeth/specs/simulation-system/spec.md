# simulation-system Delta — restore-ci-correctness-teeth

## MODIFIED Requirements

### Requirement: Statistical Validation

The system SHALL validate game balance through statistical analysis, and the statistical combat proofs SHALL be gated in the blocking pull-request lane — not only in a non-gating nightly run. A pull request that changes combat-affecting code SHALL NOT merge unless a statistical batch large enough to exercise the existence assertions (a `SIMULATION_COUNT` at least equal to `STATISTICAL_PROOF_GAME_MIN`, so the `statisticalIt` gate in `integration.test.ts` resolves to a running test rather than `it.skip`) has passed as a required check, OR a passing full nightly statistical batch is enforced as a documented merge requirement for those PRs. The PR-lane batch MAY be bounded by PR-sized time caps; the full nightly batch is retained as the high-confidence run.

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

#### Scenario: Statistical proofs run in the blocking PR lane

- **GIVEN** the PR CI configuration, which today sets `SIMULATION_COUNT=5` for the perf-smoke job (below `STATISTICAL_PROOF_GAME_MIN=100`) so every `statisticalIt`-gated proof in `integration.test.ts` is skipped
- **WHEN** a pull request that touches combat-affecting code runs CI
- **THEN** a required check SHALL execute the statistical proofs with `SIMULATION_COUNT >= STATISTICAL_PROOF_GAME_MIN`, so the existence assertions actually run
- **AND** that required check SHALL be a member of the `lint-and-test` aggregator's `needs` set so branch protection enforces it
- **OR**, where a passing full nightly statistical batch is enforced as the documented merge requirement instead, the absence of a passing nightly batch SHALL block the merge.

#### Scenario: Combat-touching PR cannot merge without a statistical proof having passed

- **GIVEN** a pull request that modifies combat math, damage resolution, or the simulation runner
- **WHEN** no statistical proof (PR-lane batch or required nightly batch) has passed for that change
- **THEN** the merge SHALL be blocked
- **AND** a green build that exercised zero statistical combat coverage SHALL NOT be sufficient to merge.

### Requirement: Programmatic Exclusion

The system SHALL provide a function to check whether a violation is a known limitation, and that suppression SHALL be opt-in per detector rather than applied to any violation whose message text matches a broad pattern. A violation SHALL be suppressed only when its emitting invariant is explicitly designated as a legacy generic detector (via an allowlist of suppressible invariant names or an explicit legacy marker on the violation); a violation from any detector not so designated SHALL be surfaced. Category patterns used for classification SHALL match whole tokens or phrases (word-boundary / anchored) so that incidental substrings — such as "discharge" matching a "charge" pattern, or "loss"/"close" matching a "los" pattern — do NOT trigger a known-limitation classification.

**Priority**: Critical

#### Scenario: Exclude known limitation

**GIVEN** violation for physical attack (not implemented)
**WHEN** calling isKnownLimitation(violation)
**THEN** function SHALL return true
**AND** violation SHALL NOT be reported as bug

#### Scenario: New detector is surfaced, not swallowed by substring bleed

- **GIVEN** a newly-added detector with an invariant name not on the suppressible-legacy allowlist, whose violation message contains an incidental combat-adjacent substring (for example a message containing "discharge", "loss", or "close")
- **WHEN** the violation is passed to `isKnownLimitation` / `filterKnownLimitations` / `partitionViolations`
- **THEN** the violation SHALL be surfaced as a potential bug, NOT classified as a known limitation
- **AND** the broad-pattern substring match alone SHALL NOT suppress it.

#### Scenario: Legacy generic detector remains suppressible by explicit opt-in

- **GIVEN** a violation emitted by an invariant explicitly designated as a legacy generic detector (on the suppressible allowlist or carrying the explicit legacy marker)
- **WHEN** the violation is filtered
- **THEN** it SHALL be classified as a known limitation and excluded from bug reports
- **AND** retiring or relabeling that legacy detector SHALL update the classification accordingly, in lockstep with the per-category contract traps.

## ADDED Requirements

### Requirement: Perf Budget Blocking PR Lane

The system SHALL execute the simulation wall-clock perf-budget assertions in a blocking pull-request lane, so a performance regression fails a pull request rather than only the non-gating nightly run.

#### Scenario: Perf budgets run on PRs in a dedicated uncontended job

- **GIVEN** the `perfIt` wall-clock budget assertions in `src/simulation/__tests__/simulation.test.ts`, which today resolve to `it.skip` whenever `JEST_EXCLUDE_PERF_SENSITIVE === 'true'` (set by the PR unit-test shards) and are absent from the perf-smoke job's test path list
- **WHEN** a pull request runs CI
- **THEN** a required PR job SHALL run `simulation.test.ts` with the perf budgets enabled (via the `SIMULATION_PERF_ASSERTIONS=true` override the file already honors), in a dedicated runner that is NOT the contended unit-test shard lane
- **AND** the job SHALL use PR-sized wall-clock budget caps so it stays within the PR time budget while still failing on gross regressions.

#### Scenario: Perf-budget job is enforced by branch protection

- **GIVEN** the perf-budget PR job
- **WHEN** the `lint-and-test` aggregator evaluates its dependencies
- **THEN** the perf-budget job SHALL be a member of the aggregator's required `needs` set
- **AND** a perf regression SHALL therefore fail the branch-protection required check, not only the nightly lane.
