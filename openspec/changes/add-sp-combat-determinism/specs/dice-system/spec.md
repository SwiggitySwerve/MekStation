# dice-system Delta — add-sp-combat-determinism

## ADDED Requirements

### Requirement: Seeded D6Roller Implementation

The dice system SHALL provide a seeded `D6Roller` implementation — the `SeededD6Roller` adapter bridging the engine-layer `SeededRandom` PRNG into the gameplay-layer `D6Roller` contract — as a first-class production roller variant alongside `defaultD6Roller`, the crypto-backed server roller, and the replay roller. The adapter SHALL accept either a numeric seed or an existing `SeededRandom` instance, SHALL expose a function-shaped adapter satisfying the `D6Roller` type, and SHALL derive every roll from the seeded PRNG stream — it SHALL NOT call `Math.random`.

**Priority**: High

#### Scenario: Same seed reproduces the same roll sequence

- **GIVEN** two `SeededD6Roller` instances constructed from the same numeric seed
- **WHEN** each roller is called N times
- **THEN** the two sequences SHALL be pairwise identical for all N rolls
- **AND** every rolled value SHALL be an integer between 1 and 6 inclusive

#### Scenario: Adapter satisfies the D6Roller contract

- **GIVEN** a `SeededD6Roller` instance
- **WHEN** its function-shaped adapter (`asD6Roller()`) is passed to a callsite typed against `D6Roller`
- **THEN** the callsite SHALL consume it without modification
- **AND** the adapter SHALL carry the roller's seeded stream state across calls

#### Scenario: Seeded roller never touches Math.random

- **GIVEN** a `SeededD6Roller` constructed from a seed
- **WHEN** any number of rolls are produced
- **THEN** every value SHALL derive from the seeded PRNG stream
- **AND** no call to `Math.random` SHALL occur in the roller's implementation

### Requirement: Determinism Tests Assert Invariants, Not Golden Traces

Tests that verify seeded-dice determinism SHALL assert same-seed self-consistency invariants — two runs with the same seed and identical inputs within one build produce identical outcomes — and SHALL NOT hardcode expected roll values, roll sequences, or battle outcomes for any specific seed. Seed→outcome mappings are version-pinned: any engine rules change, resolver reorder, or AI adjustment MAY legally change what a given seed produces, and determinism tests SHALL remain valid across such changes. Feeding a scripted stub roller as a test input is NOT a golden trace and remains permitted.

**Priority**: High

#### Scenario: Same-seed self-consistency is the asserted invariant

- **GIVEN** two identical game scenarios executed with the same seed within one build
- **WHEN** a determinism test compares their outcomes
- **THEN** the test SHALL assert equality between the two runs' outcomes
- **AND** the test SHALL NOT assert that the seed produces any specific pre-recorded value

#### Scenario: Engine version changes do not break determinism tests

- **GIVEN** an engine change that alters the number or order of dice consumed by a resolver
- **WHEN** the determinism test suite runs against the new version
- **THEN** same-seed self-consistency assertions SHALL still pass without fixture regeneration
- **AND** no test SHALL fail solely because a seed now maps to a different outcome than in a prior version

#### Scenario: Scripted stub rollers remain valid test inputs

- **GIVEN** a test that injects a stub `D6Roller` producing a scripted sequence
- **WHEN** the test asserts behavior downstream of those scripted rolls
- **THEN** the test SHALL be considered an injected-input test, not a golden-trace assertion
- **AND** this requirement SHALL NOT forbid it
