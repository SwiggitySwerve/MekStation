# damage-system Specification Delta

## ADDED Requirements

### Requirement: Expected Damage Helper

The damage system SHALL expose `expectedDamage(weapon: IWeapon,
hitProbability: number): number` that returns the statistical mean
damage for a weapon given its hit probability, with cluster weapons
integrating the cluster hit table expectation.

#### Scenario: Single-shot weapon expected damage

- **GIVEN** a Medium Laser (single-shot, 5 damage) and
  `hitProbability = 0.72`
- **WHEN** `expectedDamage(weapon, 0.72)` is called
- **THEN** the result SHALL equal 3.6 (= 0.72 × 5)

#### Scenario: Cluster weapon expected damage

- **GIVEN** an LRM-10 (1 damage per missile, 10-rack) and
  `hitProbability = 0.5`
- **WHEN** `expectedDamage(weapon, 0.5)` is called
- **THEN** the result SHALL equal 3.07 (= 0.5 × 6.14 × 1) within ±0.01
- **AND** the expected cluster hits SHALL be 6.14 (standard 10-rack
  cluster table expectation)

#### Scenario: Streak weapon all-or-nothing

- **GIVEN** a Streak SRM-4 (2 damage per missile, 4-rack) and
  `hitProbability = 0.6`
- **WHEN** `expectedDamage(weapon, 0.6)` is called
- **THEN** the result SHALL equal 4.8 (= 0.6 × 4 × 2, Streak fires all
  missiles on a successful lock-on)

#### Scenario: Zero hit probability yields zero damage

- **GIVEN** any weapon with `hitProbability = 0`
- **WHEN** `expectedDamage(weapon, 0)` is called
- **THEN** the result SHALL equal 0

#### Scenario: One-shot weapon respects remaining shots

- **GIVEN** a one-shot SRM-2 launcher that has already fired
- **WHEN** `expectedDamage(weapon, 0.5)` is called
- **THEN** the result SHALL equal 0 (no remaining shots)

### Requirement: Damage Variance Helper

The damage system SHALL expose `damageVariance(weapon: IWeapon,
hitProbability: number): number` that returns the standard deviation
(not raw variance) of damage so that the UI can display `±stddev`
directly without additional math.

#### Scenario: Single-shot weapon stddev

- **GIVEN** a Medium Laser (5 damage) with `hitProbability = 0.5`
- **WHEN** `damageVariance(weapon, 0.5)` is called
- **THEN** the result SHALL equal 2.5 (= sqrt(0.5 × 0.5) × 5)

#### Scenario: Stddev clamps to zero at extreme probabilities

- **GIVEN** a Medium Laser with `hitProbability = 1.0`
- **WHEN** `damageVariance(weapon, 1.0)` is called
- **THEN** the result SHALL equal 0 (certain hit, no variance)

- **GIVEN** the same weapon with `hitProbability = 0.0`
- **WHEN** `damageVariance(weapon, 0.0)` is called
- **THEN** the result SHALL equal 0 (certain miss, no variance)

#### Scenario: Cluster weapon stddev includes cluster distribution

- **GIVEN** an LRM-10 with `hitProbability = 0.5`
- **WHEN** `damageVariance(weapon, 0.5)` is called
- **THEN** the result SHALL combine the Bernoulli hit variance with
  the cluster table variance (formula documented in implementation)
- **AND** the result SHALL be strictly greater than the non-cluster
  variance for the same expected damage

### Requirement: Cluster Hit Table Expectations

The damage system SHALL pre-compute and cache
`expectedClusterHits[rackSize]` for each cluster rack size (2, 3, 4, 5,
6, 7, 8, 9, 10, 12, 15, 20) as the dot product of the 2d6 probability
mass and the cluster table row, avoiding re-computation during UI
interaction.

#### Scenario: Expected hits for 10-missile rack

- **GIVEN** the standard TechManual cluster table
- **WHEN** `expectedClusterHits[10]` is read
- **THEN** the result SHALL equal 6.14 within ±0.01

#### Scenario: Expected hits for 2-missile rack

- **GIVEN** the standard TechManual cluster table
- **WHEN** `expectedClusterHits[2]` is read
- **THEN** the result SHALL equal 1.42 within ±0.01

#### Scenario: Constant cached after first access

- **GIVEN** `expectedClusterHits` has been accessed once
- **WHEN** the same index is accessed 1000 more times
- **THEN** the underlying computation SHALL run exactly once (cached
  module-level constant)
