# color-system Specification

## Purpose

Defines Color System requirements for Critical Slot Colors, Equipment Type Colors, Status Colors, and Tech Base Colors, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

## Requirements

### Requirement: Critical Slot Colors

The system SHALL fill each fixed-system slot with its family hue's fill, with primary text and a 4px left bar in the full hue, so families differ at a glance. The hue is the token of the slot colour owner's accent class; each token's fill is one explicit OKLCH colour in `src/utils/colors/slotFills.ts` that is never mixed with the theme surface, so it keeps its hue on every theme. The approved critical-slot values are pinned in `src/components/customizer/protected/protectedSlotColors.ts`.

#### Scenario: Engine slot coloring

- **WHEN** slot contains engine component
- **THEN** slot is filled with the dark orange-400 fill (owner accent border-l-orange-400/35)
- **AND** its 4px left bar uses the full orange-400 hue

#### Scenario: Gyro slot coloring

- **WHEN** slot contains gyro component
- **THEN** slot is filled with the dark purple-400 fill (owner accent border-l-purple-400/35)
- **AND** its 4px left bar uses the full purple-400 hue

#### Scenario: Actuator slot coloring

- **WHEN** slot contains actuator (shoulder, upper arm, lower arm, hand, hip, upper leg, lower leg, foot)
- **THEN** slot is filled with the dark blue-400 fill (owner accent border-l-blue-400/35)
- **AND** its 4px left bar uses the full blue-400 hue

#### Scenario: Cockpit system coloring

- **WHEN** slot contains life support, sensors, or cockpit
- **THEN** slot is filled with the dark neutral slate-400 fill (owner accent border-l-slate-400/60)
- **AND** its 4px left bar uses the full slate-400 hue, distinct from energy weapon hues

#### Scenario: Fills keep their hue on every theme

- **WHEN** the user switches between themes such as navy, petrol, field or slate
- **THEN** every slot fill renders the same colour, because no fill is mixed with the theme surface
- **AND** each hued fill keeps an OKLCH chroma of at least 0.05 within 30 degrees of its bar hue, and primary text on every fill keeps a contrast ratio of at least 4.5:1 at rest and on hover

#### Scenario: Empty slot coloring

- **WHEN** slot is empty and has no interaction highlight
- **THEN** slot uses bg-transparent and text-text-theme-muted
- **AND** border is faint and dashed with border-border-theme-subtle/20, so occupied slots provide the primary visual structure

#### Scenario: Unhittable slot coloring

- **WHEN** slot contains Endo structure or Ferro armor
- **THEN** slot retains bg-slate-500/40 and text-slate-300
- **AND** border-slate-400 and border-dashed distinguish it from empty slots and fixed systems

### Requirement: Equipment Type Colors

The system SHALL fill mounted critical-slot equipment with its category hue's fill, the hue token of the same accentBorder used by the loadout rail and catalog, with text-text-theme-primary and a 4px left bar in the full hue. Equipment names and multi-slot brackets SHALL remain visible independently of color. Category, family and pattern colours that can share a 'Mech's slots SHALL differ by at least 6 OKLab units in their fills and 10 in their bars, unless one of the pair carries a pattern.

#### Scenario: Weapon coloring

- **WHEN** a critical slot contains a weapon
- **THEN** the slot hue is yellow-300 for energy, red-500 for ballistic, or teal-500 for missile weapons
- **AND** list views use the same full yellow-300 energy accent as the slots, which stays lighter and greener than the amber-400 selection accent used by active tabs and primary buttons
- **AND** artillery uses violet-500, capital weapons use fuchsia-500, and physical weapons use pink-400, clearly apart from the ballistic red
- **AND** the filled surface keeps high-contrast primary text

#### Scenario: Ammunition coloring

- **WHEN** a critical slot contains ammunition
- **THEN** the slot takes its weapon type's hue (teal-500 for missile ammunition, red-500 for ballistic ammunition) with that hue's fill and bar
- **AND** it adds diagonal stripes in the same hue, so a bin is told apart from the weapon it feeds
- **AND** ammunition with no weapon type uses the neutral slate-300 hue with the same stripes
- **AND** loadout cards and catalog rows for ammunition use the weapon type's bar colour

#### Scenario: Heat sink coloring

- **WHEN** a critical slot contains a heat sink
- **THEN** the slot is filled with the cyan-400 fill and a 4px cyan-400 bar
- **AND** the fill is solid with no pattern, at least 6 OKLab units from every other fill that can share a 'Mech's grid, so heat sinks are told apart by colour alone

#### Scenario: General equipment coloring

- **WHEN** a critical slot contains other equipment
- **THEN** electronics use border-l-lime-400, movement equipment uses border-l-emerald-600, and structural and miscellaneous equipment use border-l-slate-500
- **AND** the category fill accompanies readable equipment names

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

#### Scenario: Disabled buttons share one style

- **WHEN** a button is disabled (the shared `Button`, or any button using `disabledButtonClasses` from `src/components/ui/Button.tsx`, also exposed as `customizerStyles.button.disabledVisible`)
- **THEN** it shows a solid 1px border in the default border color, a transparent background, secondary text at 85% opacity and a not-allowed cursor, with no hover change
- **AND** its border is never dashed, because a dashed outline means an empty slot to fill

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

### Requirement: Build Summary Colors

The system SHALL colour the Overview Build Summary tonnage bar and its legend with the same meanings as the critical slots.

#### Scenario: Systems keep their slot colours

- **WHEN** the Build Summary bar shows engine, gyro, cockpit, heat sink or jump jet tonnage
- **THEN** each segment and legend swatch uses that family's slot bar colour (engine orange-400, gyro purple-400, cockpit slate-400, heat sinks cyan-400, jump jets the movement emerald-600)
- **AND** structure, armor and equipment use neutrals (slate-600, slate-300 and stone-500); equipment, the payload, is a warm mid stone at least 10 OKLab units from every other segment, so it separates clearly from the cool slate structure and cockpit on narrow segments, and still never reads as the light armor segment beside it or as free space; the legend swatches match the bar

### Requirement: Color Legend

The system SHALL provide a collapsible Colour Key reference panel and an always-visible compact colour key in the desktop critical-slot toolbar.

#### Scenario: Desktop critical-slot colour key

- **WHEN** critical slots are displayed at desktop width
- **THEN** a compact inline key shows labelled swatches for the equipment categories present on the unit, one swatch per fixed-system family (engine, gyro, actuators, cockpit / life support / sensors), and empty slots
- **AND** each category and family swatch is a miniature slot with the same fill, 4px bar and pattern classes as the displayed slots, so the key shows exactly what the slots render
- **AND** ammunition shows one neutral striped swatch labelled "Ammo (Striped)", because each bin takes its weapon's colour
- **AND** Empty is a dashed outline on the deep surface, like an empty slot
- **AND** the key is two right-aligned rows, one per group: the present equipment categories on the first row, and the fixed-system families and Empty on the second, so the rows stay balanced
- **AND** swatches are 14px by 12px and labels are 13px
- **AND** phone layouts use the Colour Key disclosure, a 44px boxed button in the same secondary border, fill and cream text as the Auto-Arrange and Reset… buttons beside it

#### Scenario: Legend display

- **WHEN** user expands color legend
- **THEN** equipment category fills, fixed-system family fills, empty and unhittable slots, and tech-base colors are shown with labeled swatches
- **AND** descriptions explain each color's meaning
