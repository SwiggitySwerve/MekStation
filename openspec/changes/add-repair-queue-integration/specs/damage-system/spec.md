# damage-system Specification Delta

## ADDED Requirements

### Requirement: Damage State Drives Repair Ticket Generation

The `IUnitCombatState` produced by the `PostBattleProcessor` SHALL be the
canonical input to the repair queue builder, which SHALL produce one or
more `IRepairTicket` entries covering every non-zero damage artifact on
the unit.

#### Scenario: Armor loss produces one armor ticket per location

- **GIVEN** a combat state with `currentArmorPerLocation = { LT: -10 }`
  (10 points lost)
- **WHEN** `buildTickets(unit, state, outcome)` is called
- **THEN** the result SHALL contain exactly one ticket with
  `workType = "armor"`, `location = LT`, `partsRequired` reflecting 10
  armor points of the unit's armor type

#### Scenario: Structure loss produces one structure ticket per location

- **GIVEN** a combat state with structure lost in RT and CT
- **WHEN** `buildTickets` is called
- **THEN** the result SHALL contain one `workType = "structure"` ticket
  for RT and one for CT

#### Scenario: Destroyed component produces one component ticket per entry

- **GIVEN** a combat state with `destroyedComponents` containing a
  Medium Laser in RA and a Heat Sink in LT
- **WHEN** `buildTickets` is called
- **THEN** the result SHALL contain two `workType = "component"` tickets

#### Scenario: Ammo depletion produces one ammo ticket per ammo type

- **GIVEN** a combat state with `ammoRemaining` showing 8 LRM rounds (max 16) and 12 AC/20 rounds (max 12)
- **WHEN** `buildTickets` is called
- **THEN** the result SHALL contain exactly one `workType = "ammo"`
  ticket for LRM ammo (AC/20 is at full, no ticket)

### Requirement: Repair Priority From Damage Severity

Each repair ticket's priority SHALL be derived from the component and
location affected.

#### Scenario: CT structure is CRITICAL priority

- **GIVEN** a ticket for structure loss in CT
- **WHEN** priority is derived
- **THEN** the ticket's priority SHALL be `CRITICAL`

#### Scenario: Engine/gyro/life-support are CRITICAL

- **GIVEN** a destroyed-component ticket for engine, gyro, or life support
- **WHEN** priority is derived
- **THEN** the ticket's priority SHALL be `CRITICAL`

#### Scenario: Cockpit/sensors are HIGH

- **GIVEN** a destroyed-component ticket for cockpit or sensors, or a
  structure ticket for head
- **WHEN** priority is derived
- **THEN** the ticket's priority SHALL be `HIGH`

#### Scenario: Armor tickets are NORMAL

- **GIVEN** a ticket with `workType = "armor"`
- **WHEN** priority is derived
- **THEN** the ticket's priority SHALL be `NORMAL`

#### Scenario: Ammo tickets are LOW

- **GIVEN** a ticket with `workType = "ammo"`
- **WHEN** priority is derived
- **THEN** the ticket's priority SHALL be `LOW`

### Requirement: Destroyed Units Produce No Tickets

A unit with `finalStatus = DESTROYED` SHALL NOT produce any repair
tickets; the unit is a write-off and a salvage-only candidate.

#### Scenario: Destroyed unit is skipped

- **GIVEN** a unit with `finalStatus = DESTROYED` in the outcome
- **WHEN** the repair queue builder runs over the roster
- **THEN** no tickets SHALL be generated for that unit
- **AND** the unit SHALL be flagged `combatReady = false` permanently until
  manual intervention or salvage
