# repair Specification

## Purpose
TBD - created by archiving change add-repair-system. Update Purpose after archive.
## Requirements
### Requirement: Damage Assessment

The system SHALL assess damage to units after battles.

#### Scenario: View damage report

- **GIVEN** a unit took damage in a mission
- **WHEN** viewing the repair bay
- **THEN** a damage report shows all damage by location
- **AND** armor, structure, and component damage are itemized
- **AND** estimated repair costs are displayed

#### Scenario: Destroyed components listed

- **GIVEN** a unit has destroyed components
- **WHEN** viewing the damage assessment
- **THEN** destroyed components are highlighted
- **AND** replacement cost is shown separately
- **AND** availability is indicated

### Requirement: Repair Execution

The system SHALL allow players to repair damaged units.

#### Scenario: Full repair

- **GIVEN** a damaged unit and sufficient resources
- **WHEN** the player selects "Full Repair"
- **THEN** all damage is repaired
- **AND** resources are deducted
- **AND** the unit returns to full operational status

#### Scenario: Partial repair

- **GIVEN** a damaged unit and limited resources
- **WHEN** the player selects specific repairs
- **THEN** only selected repairs are performed
- **AND** remaining damage persists
- **AND** only the partial cost is deducted

#### Scenario: Insufficient resources

- **GIVEN** repair cost exceeds available resources
- **WHEN** attempting full repair
- **THEN** the repair is blocked
- **AND** a message shows resource shortage
- **AND** partial repair is suggested

### Requirement: Repair Costs

The system SHALL calculate repair costs based on damage.

#### Scenario: Armor repair cost

- **GIVEN** armor damage
- **WHEN** calculating repair cost
- **THEN** cost is based on armor points × per-point rate
- **AND** rate varies by armor type

#### Scenario: Structure repair cost

- **GIVEN** internal structure damage
- **WHEN** calculating repair cost
- **THEN** cost is higher than armor (structure is more expensive)
- **AND** severe damage costs more per point

#### Scenario: Component replacement cost

- **GIVEN** a destroyed component
- **WHEN** calculating replacement cost
- **THEN** cost equals component value
- **AND** rare components cost more
- **AND** salvage can reduce cost

### Requirement: Repair Queue

The system SHALL manage a queue of pending repairs.

#### Scenario: Add to queue

- **GIVEN** multiple damaged units
- **WHEN** the player queues repairs
- **THEN** repairs are added to the queue
- **AND** queue order determines priority

#### Scenario: Queue progression

- **GIVEN** a repair queue with items
- **WHEN** time passes (missions complete)
- **THEN** queued repairs progress
- **AND** completed repairs restore units

#### Scenario: Prioritize repairs

- **GIVEN** multiple units in queue
- **WHEN** the player reorders the queue
- **THEN** priority changes
- **AND** higher priority units repair first

### Requirement: Field Repairs

The system SHALL allow limited field repairs between missions.

#### Scenario: Apply field repair

- **GIVEN** a damaged unit after a mission
- **WHEN** the player applies field repair
- **THEN** partial armor is restored
- **AND** no C-Bills are spent
- **AND** structural damage remains

#### Scenario: Field repair limitations

- **GIVEN** severe damage (destroyed components)
- **WHEN** attempting field repair
- **THEN** only armor can be partially restored
- **AND** structure and components require the repair bay

### Requirement: Salvage for Repairs

The system SHALL allow salvage to offset repair costs.

#### Scenario: Use salvaged parts

- **GIVEN** salvaged components in inventory
- **WHEN** a matching component needs replacement
- **THEN** salvage can be used instead of purchase
- **AND** no C-Bill cost for that component

#### Scenario: Salvage availability

- **GIVEN** a destroyed component
- **WHEN** viewing replacement options
- **THEN** salvage inventory is checked
- **AND** matching parts are offered as options

