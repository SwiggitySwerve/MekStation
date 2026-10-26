# color-system Specification

## Purpose

Defines Color System requirements for Critical Slot Colors, Equipment Type Colors, Status Colors, and Tech Base Colors, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

## Requirements

### Requirement: Critical Slot Colors

The system SHALL keep fixed systems visually quieter than mounted equipment, using neutral surfaces and thin muted left accents.

#### Scenario: Engine slot coloring

- **WHEN** slot contains engine component
- **THEN** slot uses bg-surface-base and text-text-theme-secondary
- **AND** its 2px left accent uses border-l-orange-400/35

#### Scenario: Gyro slot coloring

- **WHEN** slot contains gyro component
- **THEN** slot uses bg-surface-base and text-text-theme-secondary
- **AND** its 2px left accent uses border-l-purple-400/35

#### Scenario: Actuator slot coloring

- **WHEN** slot contains actuator (shoulder, upper arm, lower arm, hand, hip, upper leg, lower leg, foot)
- **THEN** slot uses bg-surface-base and text-text-theme-secondary
- **AND** its 2px left accent uses border-l-blue-400/35

#### Scenario: Cockpit system coloring

- **WHEN** slot contains life support, sensors, or cockpit
- **THEN** slot uses bg-surface-base and text-text-theme-secondary
- **AND** its 2px left accent uses border-l-slate-400/60, distinct from energy weapon accents

#### Scenario: Empty slot coloring

- **WHEN** slot is empty and has no interaction highlight
- **THEN** slot uses bg-transparent and text-text-theme-muted
- **AND** border is faint and dashed with border-border-theme-subtle/20, so occupied slots provide the primary visual structure

#### Scenario: Unhittable slot coloring

- **WHEN** slot contains Endo structure or Ferro armor
- **THEN** slot retains bg-slate-500/40 and text-slate-300
- **AND** border-slate-400 and border-dashed distinguish it from empty slots and fixed systems

### Requirement: Equipment Type Colors

The system SHALL render mounted critical-slot equipment on bg-surface-raised with text-text-theme-primary and a 4px left category accent from the same accentBorder token used by the loadout rail. Equipment names and multi-slot brackets SHALL remain visible independently of color.

#### Scenario: Weapon coloring

- **WHEN** a critical slot contains a weapon
- **THEN** the left accent is border-l-yellow-300/70 for energy, border-l-red-500 for ballistic, or border-l-teal-500 for missile weapons
- **AND** the energy accent is a paler, reduced-opacity yellow so it does not reuse the amber-400 selection accent used by active tabs and primary buttons
- **AND** artillery uses border-l-violet-500, capital weapons use border-l-fuchsia-500, and physical weapons use border-l-rose-500
- **AND** the surface remains neutral with high-contrast primary text

#### Scenario: Ammunition coloring

- **WHEN** a critical slot contains ammunition
- **THEN** the left accent uses border-l-amber-600 on the neutral equipment surface
- **AND** the ammunition accent is a deeper brown-amber that stays distinct from the amber-400 selection accent, the energy yellow, and the ballistic red

#### Scenario: Heat sink coloring

- **WHEN** a critical slot contains a heat sink
- **THEN** the left accent uses border-l-cyan-500 on the neutral equipment surface
- **AND** the cyan accent differs from the missile weapon teal accent

#### Scenario: General equipment coloring

- **WHEN** a critical slot contains other equipment
- **THEN** electronics use border-l-cyan-500, movement equipment uses border-l-emerald-500, structural equipment uses border-l-lime-500, and miscellaneous equipment uses border-l-slate-500
- **AND** the category accent accompanies readable equipment names on the neutral surface

### Requirement: Status Colors

The system SHALL use colors to indicate equipment allocation status.

#### Scenario: Allocated status

- **WHEN** equipment is placed in critical slots
- **THEN** badge shows green styling

#### Scenario: Unallocated status

- **WHEN** equipment awaits placement
- **THEN** badge shows red styling

#### Scenario: Assignable slot indication

- **WHEN** equipment is selected and slot can accept it
- **THEN** slot shows an amber placement highlight (bg-amber-500/10 and border-amber-400/70)

### Requirement: Tech Base Colors

The system SHALL distinguish Inner Sphere and Clan technology.

#### Scenario: Inner Sphere color

- **WHEN** equipment or subsystem is Inner Sphere tech
- **THEN** accent color is blue (text-blue-400)

#### Scenario: Clan color

- **WHEN** equipment or subsystem is Clan tech
- **THEN** accent color is green (text-green-400)

### Requirement: Interactive State Colors

The system SHALL indicate interactive states clearly.

#### Scenario: Selection highlight

- **WHEN** equipment is selected for assignment
- **THEN** yellow star indicator appears
- **AND** item has selection ring

#### Scenario: Drop target valid

- **WHEN** dragging equipment over valid drop target
- **THEN** target shows green background with box shadow

#### Scenario: Drop target invalid

- **WHEN** dragging equipment over invalid target
- **THEN** target shows red background
- **AND** cursor shows not-allowed

### Requirement: Validation Indicator Colors

The system SHALL use red/green/yellow for validation states.

#### Scenario: Valid state

- **WHEN** unit passes validation
- **THEN** indicator is green

#### Scenario: Error state

- **WHEN** unit has errors
- **THEN** indicator is red

#### Scenario: Warning state

- **WHEN** unit has warnings
- **THEN** indicator is yellow/orange

### Requirement: Color Legend

The system SHALL provide a collapsible Colour key reference panel and an always-visible compact colour key in the desktop critical-slot toolbar.

#### Scenario: Desktop critical-slot colour key

- **WHEN** critical slots are displayed at desktop width
- **THEN** a compact inline row shows labelled swatches for the equipment categories present on the unit, fixed systems, and empty slots
- **AND** swatches use the same category colour definitions as the displayed slots, with a stronger dashed outline for Empty
- **AND** swatches are at least 20px wide by 16px high with visible borders and labels are 13px
- **AND** phone layouts use the Colour key disclosure

#### Scenario: Legend display

- **WHEN** user expands color legend
- **THEN** equipment category edges, thin fixed-system accents, empty and unhittable slots, and tech-base colors are shown with labeled swatches
- **AND** descriptions explain each color's meaning
