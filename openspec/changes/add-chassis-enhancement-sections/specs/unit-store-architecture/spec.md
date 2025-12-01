## ADDED Requirements
### Requirement: Chassis State Management
The unit store SHALL support editable chassis configuration including tonnage, motive type, Omni status, and enhancement selection.

#### Scenario: Tonnage editing with engine sync
- **WHEN** setTonnage action is called
- **THEN** tonnage is updated to the new value
- **AND** engine rating is recalculated to maintain current Walk MP
- **AND** engine rating is clamped to valid range (10-500)

#### Scenario: Configuration editing
- **WHEN** setConfiguration action is called
- **THEN** configuration (MechConfiguration) is updated
- **AND** isModified is set to true

#### Scenario: Omni status editing
- **WHEN** setIsOmni action is called
- **THEN** isOmni boolean is updated
- **AND** isModified is set to true

#### Scenario: Enhancement selection
- **WHEN** setEnhancement action is called
- **THEN** enhancement field is updated (MovementEnhancementType or null)
- **AND** isModified is set to true

#### Scenario: State persistence
- **WHEN** unit state is persisted
- **THEN** isOmni, configuration, and enhancement are included
- **AND** state is restored correctly on hydration

