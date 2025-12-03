# critical-slots-display Specification

## Purpose
TBD - created by archiving change add-customizer-ui-components. Update Purpose after archive.
## Requirements
### Requirement: Location-Based Slot Display
The system SHALL display critical slots organized by mech location in a responsive grid layout.

#### Scenario: Location grid rendering
- **WHEN** the critical slots display renders
- **THEN** all 8 locations are shown (HD, CT, LT, RT, LA, RA, LL, RL)
- **AND** each location shows its correct number of slots
- **AND** grid adapts to screen size

### Requirement: Slot Color Coding
The system SHALL use consistent color coding to distinguish slot contents and equipment types.

#### Scenario: System component colors
- **WHEN** a slot contains a system component
- **THEN** Engine slots are orange
- **AND** Gyro slots are purple
- **AND** Actuator slots are blue
- **AND** Cockpit/Life Support/Sensors are yellow

#### Scenario: Equipment type colors
- **WHEN** a slot contains equipment
- **THEN** Weapons are red
- **AND** Ammunition is orange
- **AND** Heat sinks are cyan
- **AND** Other equipment is blue

#### Scenario: Empty slot display
- **WHEN** a slot is empty
- **THEN** slot is gray with dashed border
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
- **THEN** first slot shows equipment name and slot count
- **AND** middle slots show continuation marker
- **AND** border radius creates connected appearance

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
- **WHEN** user clicks Sort button
- **THEN** equipment in each location is sorted by critical slot count (largest first)
- **AND** equipment with equal slot counts is sorted alphabetically by name
- **AND** largest equipment goes to lowest indices (top of the list)
- **AND** sorted equipment is compacted to lowest available indices

#### Scenario: Reset action execution
- **WHEN** user clicks Reset button
- **THEN** all equipment locations are cleared
- **AND** all equipment moves to unallocated state
- **AND** fixed system components remain in place

#### Scenario: Fill skips already-placed unhittables
- **GIVEN** some Endo Steel slots are already placed in Left Torso
- **AND** other Endo Steel slots are unallocated
- **WHEN** Fill action executes
- **THEN** already-placed slots remain in their current locations
- **AND** only unallocated slots are distributed

### Requirement: Unallocated Equipment Display
The system SHALL display unallocated equipment in a categorized sidebar.

#### Scenario: Category organization
- **WHEN** unallocated equipment exists
- **THEN** equipment is grouped by category
- **AND** categories are collapsible
- **AND** equipment count badges are shown

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

