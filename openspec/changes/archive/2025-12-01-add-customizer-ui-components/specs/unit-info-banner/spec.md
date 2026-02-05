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

The banner SHALL display key unit statistics in a horizontal grid using "current / max" format for capacity-based stats.

#### Scenario: Movement stats display

- **WHEN** movement stats render
- **THEN** Walk MP shows as single value (e.g., "4")
- **AND** Run MP shows as single value (e.g., "6")
- **AND** Jump MP shows as single value (e.g., "0")
- **AND** each has its own labeled cell

#### Scenario: Weight stat with capacity format

- **WHEN** weight stat renders
- **THEN** label shows "WEIGHT"
- **AND** value shows "usedTonnage / maxTonnage" format (e.g., "45.5t / 50.0t")
- **AND** value text is red if used exceeds max (overweight)
- **AND** value text is yellow if within 0.5 tons of max
- **AND** value text is white/normal otherwise

#### Scenario: Critical slots stat with capacity format

- **WHEN** critical slots stat renders
- **THEN** label shows "SLOTS"
- **AND** value shows "used / total" format (e.g., "16 / 78")
- **AND** total is 78 for standard BattleMech
- **AND** value text is red if used exceeds total

#### Scenario: Armor stat with capacity format

- **WHEN** armor stat renders
- **THEN** label shows "ARMOR"
- **AND** value shows "allocated / maximum" format (e.g., "200 / 350")
- **AND** maximum is calculated from tonnage (2 × internal structure points)

#### Scenario: Heat stat with balance format

- **WHEN** heat stat renders
- **THEN** label shows "HEAT"
- **AND** value shows "generated / dissipation" format (e.g., "15 / 10")
- **AND** value text is red if generated exceeds dissipation (overheating)
- **AND** value text is green if dissipation meets or exceeds generation

### Requirement: Stat Cell Styling

Each statistic cell SHALL use consistent vertical layout with clear labeling.

#### Scenario: Cell structure

- **WHEN** stat cell renders
- **THEN** label appears at top in uppercase (slate-400, text-xs, font-medium)
- **AND** value appears in middle (text-lg, font-bold, appropriate color)
- **AND** cell is centered with appropriate spacing (gap-0.5)

#### Scenario: Capacity format display

- **WHEN** stat shows "current / max" format
- **THEN** both values appear with " / " separator
- **AND** current value inherits color based on status (normal/warning/error)
- **AND** max value appears in slate-500 (muted)
- **AND** format emphasizes current value over max

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
