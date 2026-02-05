## MODIFIED Requirements

### Requirement: Structure Tab

The Structure tab SHALL manage unit tonnage, engine, movement, and system components.

#### Scenario: Compact weight summary at top

- **WHEN** Structure tab renders
- **THEN** a compact weight summary bar appears at the top
- **AND** summary shows Engine, Gyro, Structure, Cockpit, Heat Sinks weights inline
- **AND** summary shows Total weight in amber on the right with border separator
- **AND** summary uses slate-800/50 background with slate-700 border

#### Scenario: Tonnage change

- **WHEN** user changes unit tonnage
- **THEN** engine rating is recalculated
- **AND** structure weight is recalculated
- **AND** maximum walk MP is updated

#### Scenario: Engine type selection

- **WHEN** user selects an engine type
- **THEN** engine weight and critical slots are recalculated
- **AND** options are filtered by current tech progression
