# to-hit-resolution Specification Delta

## ADDED Requirements

### Requirement: Attack Preview Projection

The to-hit resolution system SHALL expose `previewAttackOutcome(attack):
IAttackPreview` that composes the existing `forecastToHit` and
`hitProbability` helpers with damage and crit probability derivations
to produce a purely informational snapshot of what the attack would
likely do if it were fired.

#### Scenario: Preview combines hit, damage, and crit statistics

- **GIVEN** an attacker with gunnery 4, a Medium Laser at medium range
  vs. a stationary target, and a damage pipeline with standard armor
  and structure
- **WHEN** `previewAttackOutcome(attack)` is called
- **THEN** the returned `IAttackPreview` SHALL contain non-null values
  for all fields: `{hitProbability, expectedDamage, damageStddev,
critProbability, clusterHitsMean, clusterHitsStddev}`
- **AND** `hitProbability` SHALL equal the existing
  `hitProbability(forecastToHit(attack).finalTn)` result

#### Scenario: Preview is purely informational (no state mutation)

- **GIVEN** a session with no `AttackDeclared` events yet appended
- **WHEN** `previewAttackOutcome(attack)` is called 1000 times with
  the same input
- **THEN** `session.events.length` SHALL remain unchanged
- **AND** all 1000 returned previews SHALL be deeply equal
- **AND** no weapon ammo counters SHALL change

#### Scenario: Out-of-range preview

- **GIVEN** an attack where the weapon is beyond its Long range bracket
- **WHEN** the preview is computed
- **THEN** `hitProbability` SHALL equal 0
- **AND** `expectedDamage` SHALL equal 0
- **AND** `damageStddev` SHALL equal 0
- **AND** `critProbability` SHALL equal 0

#### Scenario: Cluster weapon preview includes cluster statistics

- **GIVEN** an LRM-10 attack at medium range vs. gunnery 4 target
- **WHEN** the preview is computed
- **THEN** `clusterHitsMean` SHALL equal 6.14 (standard cluster table
  expected value for a 10-missile rack)
- **AND** `clusterHitsStddev` SHALL be a positive number (stddev of
  the cluster hit distribution)
- **AND** `expectedDamage` SHALL equal `hitProbability *
clusterHitsMean * 1` (1 damage per missile)

#### Scenario: Non-cluster weapon has zero cluster variance

- **GIVEN** a Medium Laser attack (single-shot, not cluster)
- **WHEN** the preview is computed
- **THEN** `clusterHitsMean` SHALL equal 1
- **AND** `clusterHitsStddev` SHALL equal 0

### Requirement: Critical Hit Probability Derivation

The to-hit resolution system SHALL expose `critProbability(attack):
number` returning the probability that the attack produces at least
one critical hit, usable as a standalone helper or internally by
`previewAttackOutcome`.

#### Scenario: Crit probability on full-armor target

- **GIVEN** an attack on a target with full armor in all locations
- **WHEN** `critProbability(attack)` is called
- **THEN** the result SHALL equal the probability of a through-armor
  critical (TAC): `P(hit) * P(hit location roll = 2) * P(crit on 2d6)`
- **AND** the result SHALL be less than `P(hit)` (since TAC is strictly
  rarer than a hit)

#### Scenario: Crit probability with zero hit chance

- **GIVEN** an attack with `hitProbability === 0`
- **WHEN** `critProbability` is called
- **THEN** the result SHALL equal 0

#### Scenario: Crit probability aggregated across cluster hits

- **GIVEN** an LRM-10 attack where each missile independently has a
  chance to crit
- **WHEN** `critProbability` is called
- **THEN** the result SHALL aggregate expected crit occurrences across
  the expected cluster hit count (per-missile probabilities summed
  using the union-bound approximation documented in the implementation
  note)

### Requirement: Preview Determinism

`previewAttackOutcome` SHALL be deterministic for a given input —
calling it with the same attack descriptor SHALL always return the
same `IAttackPreview`.

#### Scenario: Repeated calls return identical results

- **GIVEN** a fixed attack descriptor
- **WHEN** `previewAttackOutcome(attack)` is called twice back-to-back
- **THEN** the two returned `IAttackPreview` objects SHALL be deeply
  equal

#### Scenario: No DiceRoller consumption

- **GIVEN** a session with a `DiceRoller` backed by `SeededRandom`
- **WHEN** `previewAttackOutcome(attack)` is called
- **THEN** the `DiceRoller`'s internal state SHALL NOT advance
- **AND** the next real dice roll SHALL produce the same value it
  would have produced without the preview call
