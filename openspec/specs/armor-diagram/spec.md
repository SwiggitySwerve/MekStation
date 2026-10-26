# armor-diagram Specification

## Purpose

Defines Armor Diagram requirements for SVG-Based Mech Diagram, Location Click Interaction, Real-Time Armor Value Display, and Location Color Coding, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

## Requirements
### Requirement: SVG-Based Mech Diagram

The system SHALL display an SVG diagram showing all mech armor locations for the current configuration.

#### Scenario: Biped diagram rendering

- **WHEN** the armor diagram renders for BIPED configuration
- **THEN** all 8 locations are displayed (HD, CT, LT, RT, LA, RA, LL, RL)
- **AND** torso locations show both front and rear armor sections
- **AND** diagram scales responsively within container

#### Scenario: Quad diagram rendering

- **WHEN** the armor diagram renders for QUAD configuration
- **THEN** all 8 locations are displayed (HD, CT, LT, RT, FLL, FRL, RLL, RRL)
- **AND** diagram shows 4-legged mech silhouette
- **AND** front legs are positioned forward of torso
- **AND** rear legs are positioned behind torso
- **AND** torso locations show both front and rear armor sections

#### Scenario: Tripod diagram rendering

- **WHEN** the armor diagram renders for TRIPOD configuration
- **THEN** all 9 locations are displayed (HD, CT, LT, RT, LA, RA, LL, RL, CL)
- **AND** diagram shows humanoid silhouette with center leg
- **AND** center leg is positioned centrally below torso
- **AND** torso locations show both front and rear armor sections

#### Scenario: LAM diagram rendering

- **WHEN** the armor diagram renders for LAM configuration
- **THEN** diagram shows biped silhouette by default (Mech mode)
- **AND** mode toggle control is displayed
- **AND** switching to Fighter mode shows aerospace armor mapping overlay

### Requirement: Location Click Interaction

The system SHALL support clicking locations to select them for editing based on configuration.

#### Scenario: Location selection

- **WHEN** user clicks a location
- **THEN** the location is visually highlighted (blue)
- **AND** the side panel editor shows that location's controls
- **AND** previous selection is cleared

#### Scenario: Configuration-appropriate click targets

- **WHEN** user clicks on a diagram region
- **THEN** click target SHALL correspond to valid locations for current configuration
- **AND** clicking quad front leg SHALL select FRONT_LEFT_LEG or FRONT_RIGHT_LEG
- **AND** clicking tripod center leg SHALL select CENTER_LEG

### Requirement: Real-Time Armor Value Display

The system SHALL display current armor values directly on the diagram.

#### Scenario: Armor value display

- **WHEN** armor is allocated to a location
- **THEN** front armor value is displayed on the main section
- **AND** rear armor value is displayed on the rear section (for CT, LT, RT)
- **AND** values update immediately when changed

#### Scenario: Maximum shown for every biped location

- **WHEN** the biped armor diagram renders
- **THEN** every limb shows its current armor with "/<max>" beneath it (no space after the slash, the same separator as the torso and head cells), and the head shows "<value>/<max>" on one line inside its outline
- **AND** each torso (CT, LT, RT) is labelled with its short name only ("CT", "LT", "RT", not "CT-F") and shows the front value as the primary line, "<value>/<face max>" (for example 47/48), over a smaller "R <value>/<face max>" rear line (for example R 14/15); there are no separate FRONT or REAR words on the cell
- **AND** the location's accessible name still spells out the rear face ("<location> armor: <front> of <max>, rear: <rear> of <rear max>")
- **AND** a face's max is the location maximum minus the armor the other face currently holds, the same figure the location editor shows beside its Front and Rear controls ("max 48", "max 15"), taken from one shared helper (`getArmorFaceMaximums`)
- **AND** the torso cell has no total line; the location editor's Total line remains the place that shows front + rear over the location maximum
- **AND** the quad, tripod, LAM and QuadVee diagrams use a different cell renderer and keep their existing front/rear display

#### Scenario: Biped plates stay legible and tappable on a phone

- **WHEN** the biped silhouette renders at 390x844
- **THEN** every SVG text and tspan is at least 12 rendered px, and the plate text, including the "/max" denominators, the rear line and the location names, is at least 14 rendered px (plate text uses 17 viewBox units, shown at about 0.86 px per unit because the SVG height is capped to the viewport)
- **AND** every location plate (head, torsos, arms and legs) is a button at least 44 px wide and 44 px tall; arms are narrower and side torsos wider than the earlier layout so the torso values have room
- **AND** the viewBox is cropped to the drawn silhouette ("0 20 360 402") so the cropped height, not wasted margin, sets the scale

#### Scenario: Neck and pelvis read as part of the silhouette

- **WHEN** the biped silhouette renders
- **THEN** the neck and pelvis are drawn as one structural group filled with the raised surface color, not the dark deep-surface color that read as a hole between the torso and legs
- **AND** no extra bar is drawn behind the legs

#### Scenario: Right and Left labels sit under the arms

- **WHEN** the biped silhouette renders
- **THEN** the words "Right" and "Left" are drawn directly beneath the right and left arm plates (the figure's own sides, so "Left" is on the viewer's right), not floating at the top corners of the card

#### Scenario: Location table beside the silhouette

- **WHEN** the biped silhouette card is at least 40rem wide inside (container query, not viewport width)
- **THEN** the silhouette column (up to 440px) sits beside a compact table of every location with single-line columns "Location", "Front", "Rear" and "Max", centered as a pair so no blank band is left on the card's right
- **AND** Front and Rear read "<value>/<face max>" using the same face maximums as the plates (`getArmorFaceMaximums`), Rear shows an em dash for locations without rear armor, and Max is the whole-location maximum; the table adds no calculations of its own, never overflows its card, and keeps the card's 16px padding to the right of the last column, so a selected row never touches the card edge
- **AND** each row's location is a button (`aria-pressed` when selected) and clicking anywhere on the row selects or deselects that location exactly like its plate, so the plate, the row and the location editor always agree
- **AND** a single-line 13px note directly under the table header row says values are current / max and Max is the whole location
- **AND** each row carries a status dot using the plate's health color
- **WHEN** the card is narrower (phones and narrow tablets)
- **THEN** the table is omitted because the plates already show every value, and the figure keeps its viewport-capped height

### Requirement: Location Color Coding

The system SHALL color each armor location by how full it is, using four clearly distinct health colors owned by `src/constants/armorStatus.ts`.

#### Scenario: Armor health colors

- **WHEN** a location is displayed
- **THEN** it is green (#22c55e) at 60% of its maximum or more
- **AND** yellow (#facc15) from 40% up to 60%
- **AND** orange (#f97316) from 20% up to 40%
- **AND** red (#dc2626) below 20%
- **AND** no two health colors are close in hue (amber and orange are not used side by side)
- **AND** diagrams, legends, gradients and the schematic view read these colors from the single owner instead of repeating hex values

#### Scenario: Selected location color

- **WHEN** a location is selected
- **THEN** it is highlighted with the accent/selected color rather than a health color

### Requirement: Hover Feedback

The system SHALL provide visual feedback when hovering over locations.

#### Scenario: Hover effect

- **WHEN** user hovers over a location
- **THEN** the location shows hover state (brighter color)
- **AND** cursor changes to pointer
- **AND** transition is smooth

### Requirement: Auto-Allocate Integration

The system SHALL include an auto-allocate button within the diagram section.

#### Scenario: Auto-allocate button

- **WHEN** armor diagram is displayed
- **THEN** Auto-Allocate button is shown below the title
- **AND** button shows unallocated points count
- **AND** button color indicates over-allocation status

### Requirement: Diagram Legend

The system SHALL include a legend explaining color coding.

#### Scenario: Legend display

- **WHEN** diagram is rendered
- **THEN** legend is introduced by "Armor % of max:" and shows the four health colors with their thresholds (60%+, 40%+, 20%+, <20%)
- **AND** on phones the legend text is 14px and shows the lead-in as "% of max:" (the word "Armor" stays in the accessible text) so the legend fits one line and the footer stays above the Loadout bar
- **AND** the swatches use the same colors as the diagram fills
- **AND** the biped diagram explains click interaction once, in its caption ("Front view · click a location to edit"), with the keyboard instruction (Tab to a location, then press Enter) kept as screen-reader-only text
- **AND** the biped diagram has no separate footnote or bottom instruction line

#### Scenario: Legend and unallocated footer placement

- **WHEN** the biped silhouette renders below the xl breakpoint (phones and tablets)
- **THEN** a footer inside the diagram card shows "Unallocated: <n> points" (or "Over allocated" in red when negative), the "R = rear armor" key and the four-color legend
- **AND** the SVG height is capped by the viewport (`100dvh - 31rem`, never below 20rem) so on a 390x844 phone the footer sits fully above the Loadout bar without scrolling
- **WHEN** it renders at xl or wider in the Armor tab
- **THEN** the diagram's footer is hidden and the armor inspector card ends with the legend (on its own line) and the "R = rear armor" key instead; the Unallocated Armor Points row already in the inspector is the single unallocated readout
- **AND** configurations and views that keep their built-in legend (quad, tripod, LAM, QuadVee, schematic) are unchanged

### Requirement: Configuration-Specific Diagram Components

The system SHALL render different diagram components based on mech configuration.

#### Scenario: Diagram component selection

- **WHEN** armor diagram is rendered
- **THEN** system SHALL select diagram component based on unit configuration
- **AND** BIPED SHALL use BipedArmorDiagram
- **AND** QUAD SHALL use QuadArmorDiagram
- **AND** TRIPOD SHALL use TripodArmorDiagram
- **AND** LAM SHALL use LAMArmorDiagram
- **AND** QUADVEE SHALL use QuadVeeArmorDiagram

#### Scenario: Dynamic diagram switching

- **GIVEN** user is editing a unit in customizer
- **WHEN** configuration is changed (e.g., BIPED to QUAD)
- **THEN** armor diagram SHALL switch to the appropriate component
- **AND** location selections SHALL be cleared
- **AND** armor values SHALL be preserved where locations map

### Requirement: Quad Armor Diagram

The system SHALL display a quad mech-specific armor diagram.

#### Scenario: Quad silhouette

- **WHEN** QuadArmorDiagram renders
- **THEN** diagram SHALL show 4-legged mech body
- **AND** head SHALL be positioned forward on torso
- **AND** no arm silhouettes SHALL be shown

#### Scenario: Quad location regions

- **WHEN** QuadArmorDiagram renders
- **THEN** clickable regions SHALL exist for HEAD, CT, LT, RT, FLL, FRL, RLL, RRL
- **AND** each region SHALL display current armor value
- **AND** torso regions SHALL show front and rear values

#### Scenario: Quad armor pip layout

- **WHEN** armor pips are displayed on quad diagram
- **THEN** pip positions SHALL match quad location geometry
- **AND** leg locations SHALL accommodate higher armor values (12 slots vs 6)

### Requirement: Tripod Armor Diagram

The system SHALL display a tripod mech-specific armor diagram.

#### Scenario: Tripod silhouette

- **WHEN** TripodArmorDiagram renders
- **THEN** diagram SHALL show humanoid mech with 3 legs
- **AND** center leg SHALL be positioned centrally
- **AND** arms SHALL be displayed normally

#### Scenario: Tripod location regions

- **WHEN** TripodArmorDiagram renders
- **THEN** clickable regions SHALL exist for all 9 locations
- **AND** CENTER_LEG region SHALL be clearly distinguishable

### Requirement: LAM Armor Diagram

The system SHALL display a LAM-specific armor diagram with mode toggle.

#### Scenario: LAM mode toggle

- **WHEN** LAMArmorDiagram renders
- **THEN** mode toggle control SHALL be visible
- **AND** control SHALL allow switching between MECH, AIRMECH, FIGHTER modes
- **AND** current mode SHALL be clearly indicated

#### Scenario: LAM Mech mode view

- **WHEN** LAM is in MECH mode
- **THEN** diagram SHALL display standard biped silhouette
- **AND** all 8 mech locations SHALL be shown

#### Scenario: LAM Fighter mode view

- **WHEN** LAM is in FIGHTER mode
- **THEN** diagram SHALL show fighter armor mapping
- **AND** armor values SHALL be mapped from mech locations to fighter locations
- **AND** NOSE SHALL show combined HEAD + CT armor
- **AND** LEFT_WING and RIGHT_WING SHALL show LT and RT armor
- **AND** AFT SHALL show rear torso armor

#### Scenario: LAM AirMech mode view

- **WHEN** LAM is in AIRMECH mode
- **THEN** diagram SHALL display biped silhouette with VTOL indicators
- **AND** movement stats SHALL reflect VTOL capabilities

### Requirement: QuadVee Armor Diagram

The system SHALL display a QuadVee-specific armor diagram with mode toggle.

#### Scenario: QuadVee Mech mode

- **WHEN** QuadVee is in MECH mode
- **THEN** diagram SHALL display quad mech silhouette
- **AND** all quad locations SHALL be shown

#### Scenario: QuadVee Vehicle mode

- **WHEN** QuadVee is in VEHICLE mode
- **THEN** diagram SHALL display vehicle representation
- **AND** armor SHALL be shown for Front, Left, Right, Rear, Turret

### Requirement: Vehicle Auto-Allocate Canonical Distribution Ratio

The vehicle armor auto-allocate function SHALL distribute total armor points across locations using the canonical TechManual pp.86-87 ratio: 40% Front, 20% Left Side, 20% Right Side, 10% Rear, 10% Turret (when a turret is present). When the vehicle has no turret, the ratio is normalized across the remaining four locations (sum = 0.90, redistributed proportionally). When the vehicle is a VTOL, a 2% rotor allocation is added (the rotor is a structural component, not a weapon mount, so it receives a smaller share than a turret).

This requirement makes the existing implementation testable. The store function `useVehicleStore.autoAllocateArmorLogic` (in `src/stores/useVehicleStore.actions.ts`) already applies these ratios; this scenario adds explicit numeric assertions that were absent from the prior component-level tests (which checked location presence only).

The implementation accepts `armorTonnage` (in tons) as input and converts to points via `floor(tons * 16)`. The `100-point` reference values below correspond to `armorTonnage = 6.25` (100 / 16).

#### Scenario: 100-point turreted vehicle distributes exactly 40/20/20/10/10

- **WHEN** `autoAllocateArmorLogic` runs on a turreted ground vehicle with `armorTonnage = 6.25` (100 points total)
- **THEN** the resulting allocation is `{ Front: 40, LeftSide: 20, RightSide: 20, Rear: 10, Turret: 10 }`
- **AND** the sum of allocated points equals the input total of 100

#### Scenario: Turretless vehicle redistributes turret share proportionally (sum-of-90% normalizer)

- **WHEN** `autoAllocateArmorLogic` runs on a vehicle with no turret, `armorTonnage = 6.25` (100 points total)
- **THEN** the allocation preserves the 40/20/20/10 ratio normalized across `{ Front, LeftSide, RightSide, Rear }` (normalizer = 0.90)
- **AND** Front receives `floor(100 * 0.40 / 0.90) = 44`, each Side receives `floor(100 * 0.20 / 0.90) = 22`, Rear receives `floor(100 * 0.10 / 0.90) = 11`
- **AND** Turret receives 0 (no turret installed)
- **AND** the sum of allocated points (99 due to flooring) is within 1-2 of the input total

#### Scenario: VTOL augments allocation with 2% rotor share

- **WHEN** `autoAllocateArmorLogic` runs on a VTOL with `armorTonnage = 6.25` (100 points total) and no turret
- **THEN** the rotor location receives `floor(100 * 0.02 / 0.92) = 2` points
- **AND** the Front/Side/Rear allocations preserve the 40/20/20/10 ratio normalized across the new 0.92 sum (Front=43, Side=21 each, Rear=10)
- **AND** the rotor share is intentionally smaller than a turret share (2% vs 10%) because the rotor is structural-only, not a weapon mount

