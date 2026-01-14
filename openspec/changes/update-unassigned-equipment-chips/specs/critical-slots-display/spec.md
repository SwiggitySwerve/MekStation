## MODIFIED Requirements

### Requirement: Unallocated Equipment Display
The system SHALL display unallocated equipment in a categorized sidebar or inline section.

#### Scenario: Category organization
- **WHEN** unallocated equipment exists
- **THEN** equipment is grouped by category
- **AND** categories are collapsible
- **AND** equipment count badges are shown

#### Scenario: Inline unassigned display on Critical Slots tab
- **WHEN** the Critical Slots tab is active
- **AND** unallocated equipment exists
- **THEN** unassigned equipment SHALL display as vertical chip bars in a horizontal scrollable row
- **AND** each chip SHALL use the VerticalSlotChip component

#### Scenario: Inline section hidden when all placed
- **WHEN** the Critical Slots tab is active
- **AND** all equipment is allocated to locations
- **THEN** the inline unassigned equipment section SHALL be hidden

#### Scenario: Chip selection interaction
- **WHEN** user taps an unassigned equipment chip
- **THEN** the chip becomes selected with a ring highlight
- **AND** valid placement slots are highlighted in the location grids
- **WHEN** user taps the same chip again
- **THEN** the chip becomes deselected

## ADDED Requirements

### Requirement: VerticalSlotChip Component
The VerticalSlotChip component SHALL be a rotated version of SlotRow with identical visual styling.

#### Scenario: Fixed width matching SlotRow height
- **GIVEN** a SlotRow component has a rendered height of approximately 26px
- **WHEN** a VerticalSlotChip is rendered
- **THEN** its width SHALL be exactly 26px (fixed, not flexible)
- **AND** no flex-grow, auto-expansion, or responsive padding SHALL alter this width
- **AND** the width SHALL be set via inline style to prevent CSS override

#### Scenario: Same color logic as SlotRow
- **WHEN** a VerticalSlotChip renders equipment
- **THEN** it SHALL use classifyEquipment() and getEquipmentColors() for color determination
- **AND** the colors SHALL match exactly what SlotRow would display for the same equipment name

#### Scenario: Rotated text orientation
- **WHEN** equipment name is displayed in VerticalSlotChip
- **THEN** text SHALL use writing-mode: vertical-rl
- **AND** text SHALL be rotated 180 degrees to read bottom-to-top
- **AND** text size SHALL be 10px matching SlotRow compact mode

#### Scenario: No auto-sizing
- **WHEN** VerticalSlotChip is placed in a flex container
- **THEN** it SHALL NOT grow or shrink (flexShrink: 0)
- **AND** padding SHALL be zero to prevent width expansion
- **AND** margin SHALL be minimal (1px horizontal) for tight packing
