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

#### Scenario: Responsive width matching SlotRow height at each breakpoint

- **GIVEN** SlotRow has different heights at different breakpoints (mobile ~22px, sm+ ~30px)
- **WHEN** a VerticalSlotChip is rendered
- **THEN** its width SHALL match SlotRow height at each breakpoint
- **AND** mobile width SHALL be 22px (w-[22px])
- **AND** sm+ width SHALL be 30px (sm:w-[30px])
- **AND** flex-shrink-0 SHALL prevent compression in flex containers

#### Scenario: Same color logic as SlotRow

- **WHEN** a VerticalSlotChip renders equipment
- **THEN** it SHALL use classifyEquipment() and getEquipmentColors() for color determination
- **AND** the colors SHALL match exactly what SlotRow would display for the same equipment name

#### Scenario: Consistent abbreviations with SlotRow

- **WHEN** equipment names are displayed in VerticalSlotChip or SlotRow
- **THEN** both SHALL use abbreviateEquipmentName() for consistent display
- **AND** (Clan) SHALL be abbreviated to (C)
- **AND** (Inner Sphere) SHALL be abbreviated to (IS)
- **AND** Ferro-Fibrous SHALL be abbreviated to Ferro-Fib
- **AND** Endo Steel SHALL NOT be abbreviated (kept as full name)
- **AND** tooltip SHALL show full unabbreviated name

#### Scenario: Rotated text orientation with responsive sizing

- **WHEN** equipment name is displayed in VerticalSlotChip
- **THEN** text SHALL use writing-mode: vertical-rl
- **AND** text SHALL be rotated 180 degrees to read bottom-to-top
- **AND** text size SHALL be responsive: text-[10px] on mobile, sm:text-sm on larger screens
- **AND** text sizing SHALL match SlotRow text sizing at each breakpoint

#### Scenario: No auto-sizing beyond breakpoint scaling

- **WHEN** VerticalSlotChip is placed in a flex container
- **THEN** it SHALL NOT grow or shrink beyond its breakpoint-defined width (flex-shrink-0)
- **AND** width changes SHALL only occur at Tailwind breakpoints (sm, md, lg)
- **AND** chips SHALL pack tightly with minimal gap (gap-1)
