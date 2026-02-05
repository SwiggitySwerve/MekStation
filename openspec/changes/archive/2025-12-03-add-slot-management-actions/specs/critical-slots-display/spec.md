# critical-slots-display Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
