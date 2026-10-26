# unit-info-banner Specification

## Purpose

Defines Unit Info Banner requirements for Fixed Banner Layout, Unit Identity Display, Statistics Grid, and Stat Cell Styling, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

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
- **THEN** BV appears first with neutral primary text color
- **AND** ENGINE appears second with neutral primary text color
- **AND** both use SimpleStat component
- **AND** neither uses a decorative accent hue (per command-screen focus doctrine, color is reserved for out-of-budget / invalid states)

#### Scenario: Budget readouts lead the strip

- **WHEN** the compact workbench strip renders
- **THEN** Weight, Slots, Heat and Armor form the emphasized Capacity group and use the larger value size
- **AND** each budget readout shows a 3px fill bar under its value, filled by use against its cap (clamped at full) and colored neutral, caution orange or red by the same state as its value
- **AND** readout state colors come from one owner (`unitStatStatus.ts`) shared by the banner, the build-status control and the mobile loadout header: cautions use orange, distinct from the amber accent that marks the selected tab and primary actions, and red is reserved for errors
- **AND** Walk, Run, Run+ (when present), Jump, Engine and BV use a smaller secondary value size
- **AND** group columns are proportional to their stat counts so every stat cell, and every gap between groups, has the same width
- **AND** tonnage is not repeated as its own readout, because the Weight cap shows it

#### Scenario: Weight stat with capacity format

- **WHEN** weight stat renders
- **THEN** label shows "WEIGHT"
- **AND** value shows "usedTonnage / tonnage" format (e.g., "45.5t / 50t"), the cap being the unit's tonnage
- **AND** value text is red if used exceeds max (overweight)
- **AND** value text is caution orange if within 0.5 tons of max
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
- **AND** value shows "generated / dissipation" format (e.g., "15 / 10"), and on wide screens a visible "gen / diss" caption beside the label names the two numbers
- **AND** the heat readout is always keyboard focusable, with an accessible name and a hover/focus explanation naming both numbers (e.g., "15 heat at full fire / 10 dissipation")
- **AND** value text is caution orange if generated exceeds dissipation, with the excess shown explicitly in a caution pill with a warning icon (e.g., "+5 over"; the phone strip shows "+5" and keeps "over" in the accessible name and explanation), because running hot is legal
- **AND** when running hot the explanation adds how far heat is over and that this is legal (e.g., "5 over: legal; add heat sinks to run cool.")
- **AND** red is reserved for construction errors such as overweight or over slots
- **AND** value text uses neutral primary color when dissipation meets or exceeds generation (in-budget states are not accent-highlighted, per command-screen focus doctrine)

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
- **AND** max value appears in 12px secondary text, legible on wide and phone layouts
- **AND** format emphasizes current value over max

### Requirement: Validation Status Indicator

The banner SHALL display unit validation status.

#### Scenario: Valid unit display

- **WHEN** unit passes all validation and has no cautions
- **THEN** the build status reads "Ready" in neutral text with a green check

#### Scenario: One build-status statement in the workbench

- **WHEN** the workbench section bar renders on desktop
- **THEN** the build status comes first as one statement, followed by a separate secondary save line in plain words (e.g., "Draft saved in browser · not in library")
- **AND** the save line's tooltip explains it ("Your changes are kept in this browser. Use Save to add the unit to your library…"), and each part keeps its full wording ("Draft saved in this browser", "Not saved to library") in its accessible text
- **WHEN** the unit runs hot and has no rule issues
- **THEN** the build status reads as the caution itself (e.g., "Runs hot +11") with a warning icon in the caution color, never "Valid" beside a caution, and opens a checks list whose heat note states both numbers and the excess in plain language (e.g., "Heat 33 at full fire vs 22 dissipation: 11 over.") and links to the Structure tab where heat sinks are set
- **AND** the heat note is presentational: it never adds to error or warning counts and never makes the unit invalid
- **WHEN** the unit has validation issues
- **THEN** the build status is one bordered control that leads with the worst severity in words (e.g., "2 errors"), followed by the other severities and any caution as parts of the same control; each part keeps its own accessible name (e.g., "Atlas AS7-D: 2 errors, show issues") and opens its own list
- **WHEN** the workbench renders on a phone
- **THEN** the build status shares the budget readout row with the same short wording (e.g., "Runs hot +11"; the label truncates before the amount if space runs out), its panel shows the full save state with the same explanation, and a failed browser draft write still appears as a visible line with a retry action
- **AND** with validation issues the phone control keeps the worst severity in words (e.g., "1 error") and the rest as counts, and lists any caution inside each issue list instead of as a separate part

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
- **THEN** value text uses the neutral primary color (text-text-theme-primary)
- **AND** the instrument strip relies on layout and label — not a per-stat accent hue — for quick identification (command-screen focus doctrine, principle 9)

#### Scenario: BV reactive updates

- **WHEN** unit configuration changes (armor, equipment, movement, etc.)
- **THEN** BV value updates automatically
- **AND** recalculation uses CalculationService.calculateBattleValue()
