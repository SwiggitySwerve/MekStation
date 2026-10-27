# critical-slots-display Specification

## Purpose

Defines Critical Slots Display requirements for Location-Based Slot Display, Slot Color Coding, Drag and Drop Equipment Placement, and Multi-Slot Equipment Visual Continuity, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

## Requirements

### Requirement: Location-Based Slot Display

The system SHALL display critical slots organized by mech location in a responsive grid layout.

#### Scenario: Location grid rendering

- **WHEN** the critical slots display renders
- **THEN** all 8 locations are shown (HD, CT, LT, RT, LA, RA, LL, RL)
- **AND** each location shows its correct number of slots
- **AND** grid adapts to screen size

#### Scenario: Readable desktop and touch rows

- **WHEN** the Critical Slots tab renders at desktop width with a fine pointer
- **THEN** slot rows are 30–32px tall on shared tracks with no per-row margins; slot text is 14px and slot-count annotations are at least 13px
- **AND** rows remain at least 44px tall on phones or with a coarse pointer
- **AND** the five-column arrangement follows the record sheet, with the unit's left side on the viewer's left (Left Arm, Left Torso, Head over Center Torso, Right Torso, Right Arm; Left Leg under Left Torso and Right Leg under Right Torso) and the caption "Matches the record sheet · left side on the left"
- **AND** that arrangement shows all eight Atlas AS7-D locations without scrolling at 1440x900, with or without the one-item equipment-to-place banner; shorter viewports may scroll
- **AND** both legs start on the same shared grid row directly below their torso columns, with matching widths; the arm and torso slot rows align
- **AND** the toolbar, colour key and equipment-to-place banner remain above the scrolling locations

#### Scenario: Side torso engine slot display

- **WHEN** engine type requires side torso slots (XL, Light, XXL)
- **THEN** Left Torso SHALL show engine slots at indices 0 through (sideTorsoSlots - 1)
- **AND** Right Torso SHALL show engine slots at indices 0 through (sideTorsoSlots - 1)
- **AND** engine slots SHALL be displayed with "Engine" label
- **AND** engine slots SHALL use the same engine-family tint and bar as centre-torso engine slots
- **AND** remaining slots SHALL show as empty or equipment

#### Scenario: Side torso display without engine slots

- **WHEN** engine type does not require side torso slots (Standard, Compact)
- **THEN** Left Torso SHALL show all 12 slots as available for equipment
- **AND** Right Torso SHALL show all 12 slots as available for equipment
- **AND** no engine slots SHALL be displayed in side torsos

### Requirement: Slot Color Coding

The system SHALL use consistent color coding to distinguish slot contents and equipment types.

#### Scenario: System component colors

- **WHEN** a slot contains a system component
- **THEN** Engine, Gyro, Actuator, Cockpit, Life Support and Sensor slots are tinted in their family hue from the slot colour owner (engine orange, gyro purple, actuators blue, cockpit / life support / sensors slate) with a 4px left bar in the same hue
- **AND** engine, gyro, actuator and cockpit-family rows differ at a glance, and primary text keeps a contrast ratio of at least 4.5:1 at rest and on hover

#### Scenario: Equipment type colors

- **WHEN** a slot contains equipment
- **THEN** every occupied equipment row, including every row of a merged block, is tinted in its category hue from the equipment colour owner (a 24% mix over the surface, 32% on hover) with a 4px left bar in the same full hue
- **AND** text stays the primary text colour and is never covered
- **AND** slot text has contrast of at least 4.5:1 at rest and on hover
- **AND** heat sinks keep the cyan tint and bar plus a faint diagonal hatch drawn in that cyan as their non-colour cue, because electronics share the same cyan; the hatch never reads as grey

#### Scenario: Protected slot colours

- **WHEN** the colour owners, slot rows or slot-row CSS change
- **THEN** the approved fixed-system and equipment hues, the 4px bar and the tint strengths recorded in `src/components/customizer/protected/protectedSlotColors.ts`, with its dated approval decisions, still hold
- **AND** its guard test runs in the stable Jest lane and fails if the owners, the rendered rows (single slots, every merged row, each fixed family) or row-level CSS overrides drift from that registry

#### Scenario: Colour key chips

- **WHEN** the Critical Slots colour key renders
- **THEN** each category swatch is filled with exactly its slot bar colour, using the slot's own classes and hue
- **AND** fixed systems show one swatch per family (Engine, Gyro, Actuators, Cockpit / life support / sensors) in their slot hues instead of a single grey chip, followed by Empty
- **AND** swatches are solid 12px by 12px chips with 13–14px labels; the heat-sink chip keeps darker cyan hatch lines and Empty retains a dashed outline
- **AND** heat-sink cells spell out "Heat Sink"; labels truncate with ellipsis only when needed and retain their complete accessible names

#### Scenario: Empty slot display

- **WHEN** a slot is empty
- **THEN** slot is gray with dashed border
- **AND** the dashed outline uses the strong border token at 60% opacity
- **AND** a decorative, aria-hidden plus precedes `Available` without changing the slot's accessible name or row height
- **AND** slot number is displayed

### Requirement: Drag and Drop Equipment Placement

The system SHALL support drag-and-drop for placing equipment in critical slots.

#### Scenario: Valid drop target feedback

- **WHEN** user drags equipment over an empty slot that can accept it
- **THEN** slot shows green background
- **AND** slot scales slightly

#### Scenario: Invalid drop target feedback

- **WHEN** user drags equipment over an occupied or restricted slot
- **THEN** slot shows red background
- **AND** cursor shows not-allowed

#### Scenario: Multi-slot equipment drop

- **WHEN** user hovers multi-slot equipment over a slot
- **THEN** all affected slots are highlighted
- **AND** preview shows placement range

### Requirement: Multi-Slot Equipment Visual Continuity

The system SHALL display multi-slot equipment as a connected visual group.

#### Scenario: Multi-slot rendering

- **WHEN** equipment occupies multiple slots
- **THEN** the occupied rows form one merged block with its slot range (for example, "1–10") at the top-left beside the equipment name, shown once above a muted "N slots" caption
- **AND** continuation rows have no repeated name, glyph, gap, internal border or seam, so nothing crosses the "N slots" caption
- **AND** every row of the block keeps the category tint and 4px bar, so the block reads as the same category as single-slot siblings
- **AND** per-row slot numbers are visually hidden within the block; each slot retains its complete accessible name including its slot number and existing selection, removal and drag behavior

### Requirement: Equipment Selection and Assignment

The system SHALL support click-based equipment selection and assignment.

#### Scenario: Equipment selection

- **WHEN** user clicks equipment in unallocated panel
- **THEN** equipment is selected (yellow star indicator)
- **AND** assignable slots are highlighted green
- **AND** only one equipment can be selected at a time

#### Scenario: Slot assignment

- **WHEN** user clicks an assignable slot with equipment selected
- **THEN** equipment is placed in the slot(s)
- **AND** selection is cleared

### Requirement: Equipment Removal

The system SHALL allow removal of equipment from slots.

#### Scenario: Double-click removal

- **WHEN** user double-clicks an equipment slot
- **THEN** equipment is removed
- **AND** equipment returns to unallocated pool

#### Scenario: Remove button

- **WHEN** user hovers over equipment slot
- **THEN** remove button appears
- **AND** clicking button removes equipment
- **AND** system components do not show remove button

### Requirement: Toolbar Controls

The system SHALL provide a toolbar with auto-mode toggles and manual actions.

#### Scenario: Auto Fill toggle

- **WHEN** user enables Auto Fill Unhittables toggle
- **THEN** toggle shows active state (highlighted)
- **AND** Fill action runs automatically when structure type changes to Endo Steel variant
- **AND** Fill action runs automatically when armor type changes to Ferro-Fibrous variant

#### Scenario: Auto Compact toggle

- **WHEN** user enables Auto Compact toggle
- **THEN** toggle shows active state
- **AND** Compact action runs automatically after any equipment is placed
- **AND** Compact action runs automatically after any equipment is removed

#### Scenario: Auto Sort toggle

- **WHEN** user enables Auto Sort toggle
- **THEN** toggle shows active state
- **AND** Sort action runs automatically after equipment placement
- **AND** Sort takes precedence over Compact when both are enabled

#### Scenario: Fill action execution

- **WHEN** user clicks Fill button
- **THEN** all unallocated unhittable equipment (Endo Steel, Ferro-Fibrous slots) is distributed
- **AND** distribution alternates evenly between paired locations
- **AND** distribution follows priority: LT/RT first, then LA/RA, then LL/RL, then CT, then Head

#### Scenario: Fill distribution order

- **GIVEN** 14 unallocated Endo Steel slots
- **WHEN** Fill action executes
- **THEN** slots 1-2 go to LT and RT (alternating: LT, RT, LT, RT...)
- **AND** once LT or RT is full, remaining slots continue in the other torso
- **AND** after torsos are full, slots go to LA/RA alternating
- **AND** after arms are full, slots go to LL/RL alternating
- **AND** after legs are full, slots go to CT
- **AND** Head (slot 3 only) is used last

#### Scenario: Compact action execution

- **WHEN** user clicks Compact button
- **THEN** for each location, all equipment is moved to lowest available slot indices
- **AND** equipment order is preserved (first-placed equipment stays first)
- **AND** gaps between equipment items are eliminated
- **AND** fixed system slots (actuators, engine, gyro) are skipped

#### Scenario: Sort action execution

- **WHEN** user clicks Auto-arrange in the toolbar or Sort in the slot tools
- **THEN** equipment in each location is sorted by critical slot count (largest first)
- **AND** equipment with equal slot counts is sorted alphabetically by name
- **AND** largest equipment goes to lowest indices (top of the list)
- **AND** sorted equipment is compacted to lowest available indices

#### Scenario: Reset action execution

- **WHEN** user opens Reset and confirms Reset slot assignments in the reset confirmation dialog
- **THEN** all equipment locations are cleared
- **AND** all equipment moves to unallocated state
- **AND** fixed system components remain in place

#### Scenario: Separate arrangement and reset controls

- **WHEN** the critical slot toolbar is displayed
- **THEN** Auto-arrange is a primary action separate from Reset
- **AND** the slot tools disclose automatic toggles and the Fill, Compact, and Sort actions
- **AND** opening or cancelling Reset does not change slot assignments

#### Scenario: Phone location navigation

- **WHEN** critical slots are displayed on a phone
- **THEN** one Location tablist presents all eight locations at once as a 4x2 grid of pills at least 44px tall with 14px text, in record-sheet order (LA, LT, HD, CT on the first row; RT, RA, LL, RL on the second), with no horizontal scrolling
- **AND** each pill shows its abbreviation and existing used/total occupancy (for example, "LT 8/12") with the full location name and used count in its accessible name (for example, "Left Torso, 8 of 12 used")
- **AND** the selected pill has a filled background and underline; no duplicate selector is displayed
- **AND** selecting a pill displays only its associated slot panel, headed by the full name and occupancy (for example, Left Torso — 8 of 12 used) above the slot list, without an accordion
- **AND** one pill is in the tab order; Left/Right arrows wrap, Up/Down move between the two rows, and Home/End select the first/last location
- **AND** selecting equipment reveals the first assignable location

#### Scenario: Fill skips already-placed unhittables

- **GIVEN** some Endo Steel slots are already placed in Left Torso
- **AND** other Endo Steel slots are unallocated
- **WHEN** Fill action executes
- **THEN** already-placed slots remain in their current locations
- **AND** only unallocated slots are distributed

### Requirement: Unallocated Equipment Display

The system SHALL expose unallocated equipment through the active customizer workbench loadout surface. The loadout surface SHALL follow the existing equipment-tray capability in `openspec/specs/equipment-tray/spec.md`, with categorized sections and placement actions defined by `openspec/specs/mobile-loadout-tray/spec.md` and responsive behavior defined by `openspec/specs/customizer-responsive-layout/spec.md`.

#### Scenario: Category organization

- **WHEN** unallocated equipment exists
- **THEN** the active loadout surface shows an Unassigned section with an item count
- **AND** the surface provides its supported category grouping or filtering controls
- **AND** the section remains collapsible according to the referenced equipment-tray capability

#### Scenario: Workbench loadout authority

- **WHEN** the Critical Slots tab is active in the customizer workbench
- **AND** unallocated equipment exists
- **THEN** unassigned equipment SHALL be provided by the active `ResponsiveLoadoutTray` surface
- **AND** desktop and drawer paths SHALL use the grouped `GlobalLoadoutTray` capability
- **AND** the mobile path SHALL use the responsive bottom-sheet and mobile loadout-list capability
- **AND** the workbench contract SHALL not require an inline `VerticalSlotChip` layout inside `CriticalSlotsTab`

#### Scenario: Empty unassigned state

- **WHEN** the active loadout surface is visible
- **AND** all equipment is allocated to locations
- **THEN** the surface SHALL render its defined empty or collapsed Unassigned state
- **AND** the Critical Slots tab SHALL continue to render the location grids without an inline unassigned section

#### Scenario: Loadout selection interaction

- **WHEN** user selects unassigned equipment from the active loadout surface
- **THEN** the item becomes selected using the surface's accessible selection state
- **AND** valid placement slots are highlighted in the location grids
- **WHEN** user selects the same item again or cancels selection
- **THEN** the item becomes deselected

### Requirement: Click-to-Select Placed Equipment

The system SHALL allow clicking on placed equipment to select it for reassignment.

#### Scenario: Select placed equipment

- **WHEN** user clicks on equipment in a critical slot
- **THEN** that equipment becomes selected
- **AND** valid target slots are highlighted green
- **AND** selection replaces any previous selection

#### Scenario: Reassign selected equipment

- **GIVEN** equipment is selected from a critical slot
- **WHEN** user clicks a valid empty slot
- **THEN** equipment moves from old location to new location
- **AND** selection is cleared

#### Scenario: Cancel selection

- **GIVEN** equipment is selected from a critical slot
- **WHEN** user clicks elsewhere (not a valid slot)
- **OR** user presses Escape
- **THEN** selection is cleared
- **AND** equipment remains in original location
