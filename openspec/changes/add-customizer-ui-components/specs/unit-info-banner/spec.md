## ADDED Requirements

### Requirement: Fixed Banner Layout
The Unit Information Banner SHALL render as a fixed header below the tab bar.

#### Scenario: Banner positioning
- **WHEN** customizer renders
- **THEN** banner appears at top of content area
- **AND** banner has slate-800 background with bottom border
- **AND** banner does not scroll with content

#### Scenario: Three-section layout
- **WHEN** banner renders
- **THEN** left section shows unit identity
- **AND** center section shows statistics grid
- **AND** right section shows action buttons

### Requirement: Unit Identity Display
The banner SHALL display unit name and basic classification on the left.

#### Scenario: Identity rendering
- **WHEN** unit is loaded
- **THEN** chassis name appears as xl font bold heading
- **AND** subtitle shows tonnage-ton techBase unitType format
- **AND** text is slate-100 (heading) and slate-400 (subtitle)

### Requirement: Statistics Grid
The banner SHALL display key unit statistics in a horizontal grid.

#### Scenario: Movement stat
- **WHEN** movement stat renders
- **THEN** label shows Movement
- **AND** value shows condensed format (e.g., 4/6/3)
- **AND** unit label shows MP

#### Scenario: Weight stat
- **WHEN** weight stat renders
- **THEN** label shows Weight
- **AND** value shows usedTonnage/totalTonnage format
- **AND** unit label shows tons
- **AND** value is red if overweight, normal otherwise

#### Scenario: Critical slots stat
- **WHEN** critical slots stat renders
- **THEN** label shows Critical
- **AND** value shows used/total format
- **AND** unit label shows slots

#### Scenario: Heat sinks stat
- **WHEN** heat sinks stat renders
- **THEN** label shows Heat
- **AND** value shows total heat sinks count
- **AND** unit label shows sinks

#### Scenario: Heat status stat
- **WHEN** heat status stat renders
- **THEN** label shows Heat
- **AND** value shows generation/dissipation format
- **AND** value is red if generation exceeds dissipation, green otherwise
- **AND** unit label shows gen/diss

#### Scenario: Armor stat
- **WHEN** armor stat renders
- **THEN** label shows Armor
- **AND** value shows allocated/maximum format
- **AND** unit label shows points

### Requirement: Stat Cell Styling
Each statistic cell SHALL use consistent vertical layout.

#### Scenario: Cell structure
- **WHEN** stat cell renders
- **THEN** label appears at top (slate-400, text-xs)
- **AND** value appears in middle (font-medium, appropriate color)
- **AND** unit label appears at bottom (slate-500, text-xs)
- **AND** cell is centered with appropriate spacing

### Requirement: Validation Status Indicator
The banner SHALL display unit validation status.

#### Scenario: Valid unit display
- **WHEN** unit passes all validation
- **THEN** green dot indicator appears
- **AND** Valid text in green is shown

#### Scenario: Invalid unit display
- **WHEN** unit has validation errors
- **THEN** red dot indicator appears
- **AND** text shows count Errors in red

### Requirement: Action Buttons
The banner SHALL provide quick action buttons on the right side.

#### Scenario: Reset button
- **WHEN** banner renders
- **THEN** Reset button appears with red background
- **AND** clicking opens reset confirmation dialog

#### Scenario: Debug button
- **WHEN** banner renders
- **THEN** Debug button appears with slate background
- **AND** clicking toggles debug panel visibility

### Requirement: Responsive Spacing
The statistics grid SHALL use appropriate spacing between items.

#### Scenario: Desktop spacing
- **WHEN** viewport is desktop size
- **THEN** statistics use horizontal spacing
- **AND** all statistics are visible in single row

