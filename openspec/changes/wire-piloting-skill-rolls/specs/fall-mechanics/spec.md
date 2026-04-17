# fall-mechanics (delta)

## ADDED Requirements

### Requirement: Fall Invoked From PSR Failure

`applyFall` from `src/utils/gameplay/fallMechanics.ts` SHALL be invoked whenever a PSR resolution returns failure.

#### Scenario: PSR failure calls applyFall

- **GIVEN** a PSR that resolves to failure
- **WHEN** the resolution step processes the entry
- **THEN** `applyFall(unit, fallContext)` SHALL be invoked
- **AND** a `UnitFell` event SHALL be emitted

#### Scenario: Fall direction rolled via seeded RNG

- **GIVEN** a falling mech
- **WHEN** the fall direction is determined
- **THEN** a 1d6 roll via the seeded RNG SHALL determine direction (forward / left side / backward / right side per canonical table)

#### Scenario: Fall damage computed and applied in 5-point clusters

- **GIVEN** an 80-ton mech falling from standing (height 0)
- **WHEN** fall damage is computed
- **THEN** the total SHALL be `ceil(80 / 10) × (0 + 1) = 8`
- **AND** damage SHALL apply as one 5-point cluster and one 3-point cluster
- **AND** each cluster SHALL roll the fall-direction hit-location table

#### Scenario: Fall from elevation adds to damage

- **GIVEN** a 60-ton mech falling from elevation 2
- **WHEN** fall damage is computed
- **THEN** the total SHALL be `ceil(60 / 10) × (2 + 1) = 18`
- **AND** the damage SHALL apply as three 5-point clusters and one 3-point cluster

### Requirement: Pilot Damage From Falling

A fall SHALL inflict 1 point of pilot damage and queue a consciousness check.

#### Scenario: Fall applies pilot damage

- **GIVEN** a mech that fell this turn
- **WHEN** the fall resolution completes
- **THEN** the pilot SHALL take 1 damage
- **AND** a consciousness check SHALL be queued
- **AND** a `PilotHit` event with source `Fall` SHALL be emitted

### Requirement: Prone State Tracking and Standing Up

A fallen mech SHALL be marked prone. Standing up SHALL cost walking MP and require an `AttemptStand` PSR.

#### Scenario: Unit marked prone after fall

- **GIVEN** a mech that fell this turn
- **WHEN** the fall resolution completes
- **THEN** the unit state SHALL set `prone: true`

#### Scenario: Successful stand-up

- **GIVEN** a prone mech attempting to stand
- **WHEN** the movement phase runs and the stand-up PSR resolves with success
- **THEN** the unit state SHALL set `prone: false`
- **AND** walk MP SHALL be consumed
- **AND** a `UnitStood` event SHALL be emitted

#### Scenario: Failed stand-up remains prone

- **GIVEN** a prone mech attempting to stand
- **WHEN** the stand-up PSR fails
- **THEN** the unit SHALL remain prone
- **AND** MP SHALL still be consumed (attempt cost)
- **AND** no `UnitStood` event SHALL be emitted
