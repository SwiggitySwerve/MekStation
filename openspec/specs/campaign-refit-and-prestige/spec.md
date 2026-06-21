# campaign-refit-and-prestige Specification

## Purpose

Defines Campaign Refit And Prestige requirements for Refit Order Model, Refit Classification, Refit Cost and Hours Estimation, and Refit Construction Validation Gate, preserving the source-of-truth scope introduced by archived change add-campaign-refit-and-prestige.

## Requirements
### Requirement: Refit Order Model

The system SHALL define an `IRefitOrder` describing a target configuration for
an owned campaign unit, carrying a refit class, cost and hour estimates,
progress, and a status lifecycle.

#### Scenario: A refit order carries the required fields

- **GIVEN** the player commits a refit of an owned campaign unit
- **WHEN** an `IRefitOrder` is created
- **THEN** it SHALL carry `unitId`, `targetConfiguration`, `refitClass`, `estimatedCost`, `estimatedHours`, `hoursCompleted`, and `status`
- **AND** its initial status SHALL be `proposed`

### Requirement: Refit Classification

The system SHALL classify a refit by diffing the unit's current configuration
against the target and returning the least-disruptive refit class that covers
the change.

#### Scenario: An equipment swap classifies as equipment-swap

- **GIVEN** a target configuration differing from the current only in mounted equipment
- **WHEN** `classifyRefit` runs
- **THEN** the refit class SHALL be `EquipmentSwap`

#### Scenario: A structural change classifies as chassis-conversion

- **GIVEN** a target configuration that changes the engine or internal structure
- **WHEN** `classifyRefit` runs
- **THEN** the refit class SHALL be `ChassisConversion`

### Requirement: Refit Cost and Hours Estimation

The system SHALL estimate a refit's C-bill cost and tech-hours from the
configuration diff and a per-refit-class multiplier, fixing the estimate when
the order is committed.

#### Scenario: A heavier refit class costs more

- **GIVEN** an equipment-swap order and a chassis-conversion order on comparable units
- **WHEN** both are estimated
- **THEN** the chassis-conversion estimate SHALL exceed the equipment-swap estimate in both cost and hours

#### Scenario: Estimation is deterministic

- **GIVEN** the same configuration diff
- **WHEN** the refit is estimated twice
- **THEN** both estimates SHALL be identical

### Requirement: Refit Construction Validation Gate

The system SHALL block a refit order from advancing to `in-progress` unless its
target configuration passes the existing construction-rules validation.

#### Scenario: A valid target advances the order

- **GIVEN** a `proposed` refit order whose target configuration is a valid unit
- **WHEN** the order is submitted to advance
- **THEN** its status SHALL become `in-progress`

#### Scenario: An invalid target blocks the order

- **GIVEN** a `proposed` refit order whose target configuration fails construction validation
- **WHEN** the order is submitted to advance
- **THEN** its status SHALL remain `proposed`
- **AND** the construction validation errors SHALL be surfaced

### Requirement: Refit Day Processor

The system SHALL provide a refit day processor that advances each in-progress
refit by the day's available tech-hours and completes a refit when its hour
budget is met.

#### Scenario: A refit advances each day

- **GIVEN** an `in-progress` refit order with `hoursCompleted` below `estimatedHours`
- **WHEN** the player advances the day
- **THEN** `hoursCompleted` SHALL increase by the day's available tech-hours

#### Scenario: A refit completes and swaps the configuration

- **GIVEN** an `in-progress` refit order whose `hoursCompleted` reaches `estimatedHours`
- **WHEN** the day processor runs
- **THEN** the order status SHALL become `completed`
- **AND** the unit's campaign configuration SHALL be replaced with the `targetConfiguration`
- **AND** a day event SHALL be emitted

#### Scenario: No active refits is a no-op

- **GIVEN** a campaign with no in-progress refit orders
- **WHEN** the refit day processor runs
- **THEN** the campaign SHALL be unchanged

### Requirement: Refit Launch from the Mech Bay

The system SHALL provide a refit launch flow reachable from the mech bay that
classifies and estimates the refit and commits a refit order.

#### Scenario: Launching a refit shows class and estimate

- **GIVEN** an owned campaign unit in the mech bay
- **WHEN** the player opens the refit launch flow and selects a target configuration
- **THEN** the classified refit class SHALL be shown
- **AND** the estimated cost and hours SHALL be shown

#### Scenario: Committing a refit creates an order

- **GIVEN** a refit launch flow with a target configuration selected
- **WHEN** the player commits the refit
- **THEN** a `proposed` `IRefitOrder` SHALL be created
- **AND** on construction-validation pass the order SHALL advance to `in-progress`

### Requirement: Unit Prestige Score

The system SHALL track a per-unit prestige score that rises with victories and
notable performance and falls with heavy damage and crew loss, updated when a
battle outcome is applied.

#### Scenario: A victory raises prestige

- **GIVEN** a unit with a current prestige score
- **WHEN** a battle outcome in which the unit's side won is applied
- **THEN** the unit's prestige score SHALL increase

#### Scenario: Heavy damage lowers prestige

- **GIVEN** a unit with a current prestige score
- **WHEN** a battle outcome in which the unit took heavy damage is applied
- **THEN** the unit's prestige score SHALL decrease

#### Scenario: Prestige stays within bounds

- **GIVEN** a unit whose prestige is at its maximum or minimum
- **WHEN** a prestige-raising or prestige-lowering signal is applied
- **THEN** the score SHALL not exceed its bounds

### Requirement: Company Morale State Machine

The system SHALL model company morale as an ordered state machine that applies
at most one step transition per day, driven by an enumerated set of
morale-affecting signals.

#### Scenario: Morale moves at most one step per day

- **GIVEN** a campaign at a given morale state
- **WHEN** the morale processor evaluates a day with multiple negative signals
- **THEN** the morale state SHALL move by at most one step

#### Scenario: Victories raise morale

- **GIVEN** a campaign at a non-maximum morale state
- **WHEN** the day's signals include recent victories and met pay
- **THEN** the morale state SHALL move up by one step

#### Scenario: Defeats and missed pay lower morale

- **GIVEN** a campaign at a non-minimum morale state
- **WHEN** the day's signals include recent defeats, missed pay, or desertions
- **THEN** the morale state SHALL move down by one step

#### Scenario: No signal yields no transition

- **GIVEN** a campaign with no morale-affecting signals on a given day
- **WHEN** the morale processor runs
- **THEN** the morale state SHALL be unchanged

#### Scenario: A morale change emits a day event

- **GIVEN** a day on which the morale state transitions
- **WHEN** the morale processor completes
- **THEN** a day event describing the transition SHALL be emitted

### Requirement: Prestige and Morale UI Surface

The system SHALL provide a read-only Prestige & Morale page showing the current
company morale state, recent morale transitions, and per-unit prestige scores.

#### Scenario: The surface shows morale and prestige

- **GIVEN** a campaign with a morale state, transition history, and units with prestige scores
- **WHEN** the Prestige & Morale page renders
- **THEN** the current morale state SHALL be shown
- **AND** recent morale transitions SHALL be listed
- **AND** each unit's prestige score SHALL be shown

#### Scenario: The surface exposes no mutation controls

- **GIVEN** the Prestige & Morale page is rendered
- **WHEN** the player inspects the page
- **THEN** no control SHALL allow editing morale or prestige directly

