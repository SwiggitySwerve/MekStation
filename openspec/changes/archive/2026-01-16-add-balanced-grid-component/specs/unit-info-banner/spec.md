## MODIFIED Requirements

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

### Requirement: Responsive Spacing
The statistics grid SHALL use appropriate spacing between items with responsive overrides.

#### Scenario: Base spacing
- **WHEN** statistics grid renders
- **THEN** gap is 6px (gap prop)

#### Scenario: Desktop spacing override
- **WHEN** viewport is sm breakpoint or larger
- **THEN** gap increases via className="sm:gap-1.5"
