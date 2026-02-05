## ADDED Requirements

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

#### Scenario: Auto-mode toggles

- **WHEN** user enables Auto Fill Unhittables
- **THEN** empty slots are automatically filled when equipment changes
- **AND** toggle shows active state

#### Scenario: Manual actions

- **WHEN** user clicks Fill, Compact, Sort, or Reset button
- **THEN** the corresponding operation is executed
- **AND** visual feedback confirms the action

### Requirement: Unallocated Equipment Display

The system SHALL display unallocated equipment in a categorized sidebar.

#### Scenario: Category organization

- **WHEN** unallocated equipment exists
- **THEN** equipment is grouped by category
- **AND** categories are collapsible
- **AND** equipment count badges are shown
