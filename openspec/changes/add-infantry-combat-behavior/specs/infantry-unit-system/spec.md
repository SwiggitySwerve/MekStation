# infantry-unit-system (delta)

## ADDED Requirements

### Requirement: Infantry Platoon Combat State

Each infantry platoon SHALL carry combat state tracked across the battle.

#### Scenario: Combat state initialization

- **GIVEN** a 28-trooper Foot platoon entering combat
- **WHEN** combat state is initialized
- **THEN** `unit.combatState.platoon.survivingTroopers` SHALL equal 28
- **AND** `morale = "normal"`, `pinned = false`, `routed = false`
- **AND** `fieldGunOperational` SHALL reflect whether the field gun is present and crewed
- **AND** `antiMechCommitted` SHALL be `false`

#### Scenario: State after casualties

- **GIVEN** the same platoon after taking 15 casualties
- **WHEN** combat state is read
- **THEN** `survivingTroopers` SHALL equal 13
- **AND** casualties past 75% SHALL have triggered a morale check

### Requirement: Field Gun Crew Damage

Field gun crew SHALL share in platoon damage; per 2 points of kit-adjusted damage, 1 crew is lost.

#### Scenario: Field gun crew casualty

- **GIVEN** an AC/5 field gun with 3 crew, operated by an otherwise-20-trooper platoon
- **WHEN** 4 kit-adjusted damage hits the field gun hex
- **THEN** 2 field gun crew SHALL die
- **AND** field gun remains operational (1 crew left)

#### Scenario: Field gun destroyed

- **GIVEN** a 3-crew field gun where all 3 die
- **WHEN** the final crew death event fires
- **THEN** `FieldGunDestroyed` SHALL fire
- **AND** the field gun SHALL no longer be a firing option
