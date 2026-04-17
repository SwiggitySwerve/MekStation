# salvage-rules Specification

## ADDED Requirements

### Requirement: Salvage Candidate Aggregation

The salvage engine SHALL aggregate `ISalvageCandidate` entries from every
enemy-side unit in a completed battle's `ICombatOutcome`, producing a single
`ISalvagePool` per battle.

#### Scenario: Non-INTACT enemy unit becomes a candidate

- **GIVEN** an enemy unit with `finalStatus = DAMAGED` in the outcome
- **WHEN** `aggregateSalvageCandidates(outcome)` is called
- **THEN** the pool SHALL contain a candidate with `source = "unit"` and
  `unitId` equal to the casualty's unitId
- **AND** `recoveryPercentage` SHALL reflect the damage level per the
  salvage table

#### Scenario: Destroyed unit contributes salvageable parts

- **GIVEN** an enemy unit with `finalStatus = DESTROYED` whose
  `destroyedComponents` include a Medium Laser
- **WHEN** `aggregateSalvageCandidates(outcome)` is called
- **THEN** the pool SHALL contain a candidate for the Medium Laser with
  `source = "part"`
- **AND** a unit-level candidate SHALL exist with
  `recoveryPercentage = 0` (unit cannot be recovered as a chassis)

#### Scenario: Engine and gyro are not salvageable

- **GIVEN** an enemy unit with destroyed engine and gyro components
- **WHEN** `aggregateSalvageCandidates(outcome)` is called
- **THEN** no part candidate SHALL be created for engine or gyro
- **AND** no part candidate SHALL be created for internal-structure entries

#### Scenario: INTACT enemy unit produces no candidate

- **GIVEN** an enemy unit with `finalStatus = INTACT` (retreated
  undamaged)
- **WHEN** `aggregateSalvageCandidates(outcome)` is called
- **THEN** the pool SHALL NOT contain a candidate for that unit

### Requirement: Recovery Percentage By Damage Level

The salvage engine SHALL apply canonical recovery percentages per Total
Warfare and Campaign Operations damage tables.

#### Scenario: Recovery percentage values

- **GIVEN** a unit whose damage has been classified
- **WHEN** `computeRecoveryPercentage(damageLevel)` is called
- **THEN** INTACT SHALL return 1.00
- **AND** LIGHT SHALL return 0.75
- **AND** MODERATE SHALL return 0.50
- **AND** HEAVY SHALL return 0.25
- **AND** DESTROYED SHALL return 0.00

#### Scenario: Damage level classification

- **GIVEN** a casualty with known structure-lost percentage
- **WHEN** `classifyDamageLevel(casualty)` is called
- **THEN** no armor lost SHALL classify as INTACT
- **AND** under 30% structure lost SHALL classify as LIGHT
- **AND** 30%–60% structure lost SHALL classify as MODERATE
- **AND** 60%–99% structure lost SHALL classify as HEAVY
- **AND** 100% structure lost or CT destroyed SHALL classify as DESTROYED

### Requirement: Contract-Driven Salvage Split

The salvage engine SHALL split the pool between employer and mercenary
using the contract's `salvageRights` clause (mercenary percentage 0–100)
when the contract does not call for exchange.

#### Scenario: 60% mercenary rights

- **GIVEN** a pool with total value 1,000,000 C-Bills and a contract with
  `salvageRights = 60`
- **WHEN** `splitByContract(pool, 60)` is called
- **THEN** the mercenary award total SHALL be within 10% of 600,000
- **AND** the employer award total SHALL be within 10% of 400,000

#### Scenario: Deterministic contract split

- **GIVEN** the same pool and `salvageRights` value
- **WHEN** `splitByContract` is called twice
- **THEN** both allocations SHALL be deeply equal

#### Scenario: Zero mercenary rights

- **GIVEN** a contract with `salvageRights = 0`
- **WHEN** `splitByContract` is called
- **THEN** the mercenary award SHALL be empty
- **AND** the employer award SHALL contain every candidate

### Requirement: Auction-Style Exchange Split

The salvage engine SHALL perform a seeded, alternating draft when the
contract specifies `exchangeSalvage = true`.

#### Scenario: Drafting order

- **GIVEN** a pool of 6 candidates sorted by recovered value
- **WHEN** `splitByAuction(pool, seed)` is called
- **THEN** the employer SHALL pick the 1st, 3rd, and 5th
- **AND** the mercenary SHALL pick the 2nd, 4th, and 6th
- **AND** rerunning with the same pool and seed SHALL produce the same
  allocation

### Requirement: Hostile Territory Withdrawal Modifier

The salvage engine SHALL halve the mercenary award when the player
withdrew from hostile territory (`outcome.endReason = WITHDRAWAL` and
`pool.hostileTerritory = true`).

#### Scenario: Withdrawal from hostile territory

- **GIVEN** an outcome with `endReason = WITHDRAWAL` and a pool marked
  `hostileTerritory = true`
- **WHEN** `computeSalvage(outcome, contract, terrain)` is called
- **THEN** the mercenary award total value SHALL be no more than 50% of
  what the contract split alone would produce
- **AND** `allocation.splitMethod` SHALL equal `"hostile_withdrawal"`

#### Scenario: No modifier when friendly territory

- **GIVEN** an outcome with `endReason = WITHDRAWAL` and
  `hostileTerritory = false`
- **WHEN** `computeSalvage` is called
- **THEN** no modifier SHALL be applied
- **AND** the standard contract split SHALL produce the allocation

### Requirement: Repair Cost Estimation Per Award

The salvage engine SHALL compute an `estimatedRepairCost` on each
`ISalvageAward` so campaign UIs can surface restoration cost without
invoking the full repair system.

#### Scenario: Repair cost for damaged unit

- **GIVEN** an award containing one MODERATE-damaged 50-ton mech
- **WHEN** `estimateRepairCost` is called on the award
- **THEN** the returned cost SHALL equal `50 × MODERATE_CBILLS_PER_TON`
  per the Campaign Ops table
- **AND** the cost SHALL be a positive integer

#### Scenario: Repair cost aggregates across candidates

- **GIVEN** an award with 2 unit candidates and 3 part candidates
- **WHEN** `estimateRepairCost` is called
- **THEN** the returned value SHALL equal the sum of individual candidate
  costs

### Requirement: Standalone Skirmish Yields Empty Allocation

A battle without a contract (standalone skirmish) SHALL produce an empty
salvage allocation — the player keeps nothing and owes nothing.

#### Scenario: No contractId in outcome

- **GIVEN** an `ICombatOutcome` with `contractId = null`
- **WHEN** `computeSalvage(outcome, null, terrain)` is called
- **THEN** the returned allocation SHALL have an empty pool
- **AND** both `employerAward.candidates` and `mercenaryAward.candidates`
  SHALL be empty arrays

### Requirement: Idempotent Salvage Processor

The `salvageProcessor` SHALL be idempotent — reprocessing the same
allocation in a subsequent day advancement SHALL NOT duplicate inventory
entries.

#### Scenario: Re-processing is a no-op

- **GIVEN** a campaign where `salvageProcessor` has already converted a
  mercenary award into inventory
- **WHEN** the processor runs again with the same allocation
- **THEN** no additional inventory entries SHALL be created
- **AND** the allocation SHALL be marked `processed = true`
