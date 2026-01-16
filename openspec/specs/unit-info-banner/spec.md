# unit-info-banner Specification

## Purpose
TBD - created by archiving change add-customizer-ui-components. Update Purpose after archive.
## Requirements
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
The banner SHALL display key unit statistics in a balanced grid using BalancedGrid component for even row distribution.

#### Scenario: Movement stats display
- **WHEN** movement stats render
- **THEN** Walk MP shows as single value (e.g., "4")
- **AND** Run MP shows as single value (e.g., "6")
- **AND** Jump MP shows as single value (e.g., "0")
- **AND** each has its own labeled cell

#### Scenario: BV and Engine stats display
- **WHEN** single-value stats render
- **THEN** BV appears first with cyan color
- **AND** ENGINE appears second with orange color
- **AND** both use SimpleStat component

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

#### Scenario: Balanced row distribution
- **WHEN** statistics grid renders with 10 items
- **THEN** items are distributed as 5+5 across two rows
- **AND** NOT as 6+4 uneven distribution
- **AND** BalancedGrid component with minItemWidth=75 and gap=6 is used

#### Scenario: Optional Run+ stat handling
- **WHEN** unit has maxRunMP > runMP
- **THEN** Run+ stat is included (11 total items)
- **AND** grid recalculates for balanced 6+5 or 4+4+3 distribution
- **WHEN** unit does NOT have enhanced run
- **THEN** Run+ stat is excluded from count
- **AND** conditional `{hasRunPlus && <Component/>}` is NOT counted as child

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
The statistics grid SHALL use appropriate spacing between items with responsive overrides.

#### Scenario: Base spacing
- **WHEN** statistics grid renders
- **THEN** gap is 6px (gap prop)

#### Scenario: Desktop spacing override
- **WHEN** viewport is sm breakpoint or larger
- **THEN** gap increases via className="sm:gap-1.5"

### Requirement: Editor Integration
The Unit Info Banner SHALL be rendered as part of the unit editor content in CustomizerContent.

#### Scenario: Banner renders in editor
- **WHEN** a unit is loaded in the customizer
- **THEN** UnitInfoBanner appears below the multi-unit tab bar
- **AND** banner receives unit stats from useUnitStore and useUnitCalculations
- **AND** banner is contained in a slate-900 background with bottom border

#### Scenario: Stats wiring
- **WHEN** UnitInfoBanner renders
- **THEN** name, tonnage, techBase come from useUnitStore
- **AND** walkMP, runMP, totalStructuralWeight, totalHeatDissipation, totalSystemSlots come from useUnitCalculations
- **AND** placeholder values (0) are used for jumpMP, armorPoints, heatGenerated until those systems are implemented

### Requirement: Battle Value Display
The banner SHALL display Battle Value (BV) in the statistics grid.

#### Scenario: BV stat rendering
- **WHEN** statistics grid renders
- **THEN** BV appears as first stat (before ENGINE) in Section 3
- **AND** label shows "BV"
- **AND** value shows formatted number with locale separators (e.g., "1,234")
- **AND** value shows "-" if battleValue is undefined or 0

#### Scenario: BV color styling
- **WHEN** BV stat renders
- **THEN** value text uses cyan color (text-cyan-400)
- **AND** color is distinct from other stats for quick identification

#### Scenario: BV reactive updates
- **WHEN** unit configuration changes (armor, equipment, movement, etc.)
- **THEN** BV value updates automatically
- **AND** recalculation uses CalculationService.calculateBattleValue()

