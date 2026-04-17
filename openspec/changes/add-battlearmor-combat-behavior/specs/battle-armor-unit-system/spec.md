# battle-armor-unit-system (delta)

## ADDED Requirements

### Requirement: BA Squad Combat State

Each BA squad SHALL carry per-trooper and squad-wide combat state.

#### Scenario: Combat state initialization

- **GIVEN** a 4-trooper BA squad entering combat
- **WHEN** combat state is initialized
- **THEN** `unit.combatState.squad.troopers` SHALL be a 4-element array
- **AND** each element SHALL have `alive=true`, `armorRemaining=armorPoints`, `equipmentDestroyed=[]`
- **AND** `unit.combatState.squad.swarmingUnitId` SHALL be undefined
- **AND** `unit.combatState.squad.mimeticActiveThisTurn` SHALL reflect whether the squad moved

#### Scenario: Swarm state on attach

- **GIVEN** a BA squad that successfully swarms a mech
- **WHEN** `SwarmAttached` fires
- **THEN** `unit.combatState.squad.swarmingUnitId` SHALL be set to the target mech's id

#### Scenario: Dead trooper retained in state

- **GIVEN** a 4-trooper squad where trooper index 2 has died
- **WHEN** combat state is read
- **THEN** `troopers[2].alive` SHALL be `false`
- **AND** squad fire SHALL skip trooper 2 when counting attack dice
