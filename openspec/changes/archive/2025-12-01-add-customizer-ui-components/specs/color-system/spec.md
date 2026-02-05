## ADDED Requirements

### Requirement: Critical Slot Colors

The system SHALL use distinct colors for system components in critical slots.

#### Scenario: Engine slot coloring

- **WHEN** slot contains engine component
- **THEN** slot background is orange (bg-orange-600)
- **AND** border matches with darker shade

#### Scenario: Gyro slot coloring

- **WHEN** slot contains gyro component
- **THEN** slot background is purple (bg-purple-600)

#### Scenario: Actuator slot coloring

- **WHEN** slot contains actuator (shoulder, upper arm, lower arm, hand, hip, upper leg, lower leg, foot)
- **THEN** slot background is blue (bg-blue-600)

#### Scenario: Cockpit system coloring

- **WHEN** slot contains life support, sensors, or cockpit
- **THEN** slot background is yellow (bg-yellow-600)

#### Scenario: Empty slot coloring

- **WHEN** slot is empty
- **THEN** slot background is gray (bg-gray-600)
- **AND** border is dashed

### Requirement: Equipment Type Colors

The system SHALL use consistent colors for equipment categories.

#### Scenario: Weapon coloring

- **WHEN** equipment is a weapon
- **THEN** background is red (bg-red-700)

#### Scenario: Ammunition coloring

- **WHEN** equipment is ammunition
- **THEN** background is orange (bg-orange-700)

#### Scenario: Heat sink coloring

- **WHEN** equipment is heat sink
- **THEN** background is cyan (bg-cyan-700)

#### Scenario: General equipment coloring

- **WHEN** equipment is general equipment (electronics, physical)
- **THEN** background is blue (bg-blue-700)

### Requirement: Status Colors

The system SHALL use colors to indicate equipment allocation status.

#### Scenario: Allocated status

- **WHEN** equipment is placed in critical slots
- **THEN** badge shows green styling

#### Scenario: Unallocated status

- **WHEN** equipment awaits placement
- **THEN** badge shows red styling

#### Scenario: Assignable slot indication

- **WHEN** equipment is selected and slot can accept it
- **THEN** slot shows green highlight

### Requirement: Tech Base Colors

The system SHALL distinguish Inner Sphere and Clan technology.

#### Scenario: Inner Sphere color

- **WHEN** equipment or subsystem is Inner Sphere tech
- **THEN** accent color is blue (text-blue-400)

#### Scenario: Clan color

- **WHEN** equipment or subsystem is Clan tech
- **THEN** accent color is green (text-green-400)

### Requirement: Interactive State Colors

The system SHALL indicate interactive states clearly.

#### Scenario: Selection highlight

- **WHEN** equipment is selected for assignment
- **THEN** yellow star indicator appears
- **AND** item has selection ring

#### Scenario: Drop target valid

- **WHEN** dragging equipment over valid drop target
- **THEN** target shows green background with box shadow

#### Scenario: Drop target invalid

- **WHEN** dragging equipment over invalid target
- **THEN** target shows red background
- **AND** cursor shows not-allowed

### Requirement: Validation Indicator Colors

The system SHALL use red/green/yellow for validation states.

#### Scenario: Valid state

- **WHEN** unit passes validation
- **THEN** indicator is green

#### Scenario: Error state

- **WHEN** unit has errors
- **THEN** indicator is red

#### Scenario: Warning state

- **WHEN** unit has warnings
- **THEN** indicator is yellow/orange

### Requirement: Color Legend

The system SHALL provide a collapsible color reference panel.

#### Scenario: Legend display

- **WHEN** user expands color legend
- **THEN** all color categories are shown with swatches
- **AND** descriptions explain each color's meaning
