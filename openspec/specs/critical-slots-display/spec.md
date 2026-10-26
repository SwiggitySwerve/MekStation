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
- **THEN** slot rows are 30–32px tall with 2px gaps between separate equipment items and no gaps within a merged equipment block or between flat fixed-system rows
- **AND** rows remain at least 44px tall on phones or with a coarse pointer
- **AND** the existing five-column front-view arrangement shows all eight Atlas AS7-D locations without scrolling at 1440x900, with or without the one-item equipment-to-place banner; shorter viewports may scroll
- **AND** the toolbar, colour key and equipment-to-place banner remain above the scrolling locations

#### Scenario: Side torso engine slot display

- **WHEN** engine type requires side torso slots (XL, Light, XXL)
- **THEN** Left Torso SHALL show engine slots at indices 0 through (sideTorsoSlots - 1)
- **AND** Right Torso SHALL show engine slots at indices 0 through (sideTorsoSlots - 1)
- **AND** engine slots SHALL be displayed with "Engine" label
- **AND** engine slots SHALL use orange color coding
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
- **THEN** Engine, Gyro, Actuator, Cockpit, Life Support and Sensor slots use a flat, low-contrast neutral fill with muted text at a contrast ratio of at least 4.5:1
- **AND** fixed systems have no coloured stripe

#### Scenario: Equipment type colors

- **WHEN** a slot contains equipment
- **THEN** equipment retains the category stripe defined by the equipment colour owner
- **AND** its background mixes that category colour at 16% over the base surface (18% on hover)
- **AND** slot text has contrast of at least 4.5:1 on the tint
- **AND** heat sinks use a dashed cyan stripe and a subtle diagonal fill pattern, distinguishing them from the solid Missile stripe without changing global category colours

#### Scenario: Colour key bars

- **WHEN** the Critical Slots colour key renders
- **THEN** swatches are short horizontal bars with the same stripe and tint as the slots
- **AND** labels are 13px

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
- **THEN** the occupied rows form one merged block with the equipment name shown once and a muted "N slots" caption
- **AND** continuation rows have no repeated name, glyph, gap or internal border
- **AND** the category tint and stripe span the whole block
- **AND** each slot retains its complete accessible name, slot number and existing selection, removal and drag behavior

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
- **THEN** one full-width labelled Location selector lists full location names and used/free slot counts (for example, "Left Torso · 8/12 used, 4 free")
- **AND** no duplicate location chip strip is displayed; counts reuse the existing displayed occupancy summary
- **AND** selecting a location displays only its slot grid, without a duplicate location heading or accordion
- **AND** keyboard focus remains on the selector, which has at least a 44px touch target
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
