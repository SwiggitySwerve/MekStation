# Spec Delta: Game State Management

## MODIFIED Requirements

### Requirement: Movement Event Handlers

Movement replay SHALL preserve whether a unit entered its current hull-down
state through a backward movement step so downstream combat projection can
apply vehicle backed-entry side-table rules.

#### Scenario: Hull-down entry records backward movement

- **GIVEN** a `MovementDeclared` payload with `hullDownEntryAttempt: true`
- **AND** its `steps` include a `kind: "forward"` step whose direction is
  `"backward"`
- **WHEN** game state is derived from the event stream
- **THEN** the unit SHALL have `hullDown: true`
- **AND** the unit SHALL have `hullDownEnteredBackwards: true`.

#### Scenario: Hull-down exit clears backward-entry state

- **GIVEN** a unit state has `hullDown: true`
- **AND** `hullDownEnteredBackwards: true`
- **WHEN** a `MovementDeclared` payload exits, goes prone from, or successfully
  stands out of hull-down
- **THEN** the unit SHALL have `hullDown: false`
- **AND** `hullDownEnteredBackwards` SHALL no longer be true.
