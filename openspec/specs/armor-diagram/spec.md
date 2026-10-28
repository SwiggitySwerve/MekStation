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

- **WHEN** a status-colour biped silhouette (Glow, HUD or Chromatic) renders; the Standard style draws the Blueprint diagram described under "Standard Blueprint Biped Diagram"
- **THEN** every location (head, torsos, arms and legs) uses one text stack centred on its plate and kept at least 8 viewBox units inside the outline: the location abbreviation in small bold capitals, then the location's armor in bold with its one "/<max>" muted on the same baseline (for example "34/34", "9/9"), and on torsos a muted "F<front>·R<rear>" split line under it; arms and legs add the fill bar beneath
- **AND** each torso (CT, LT, RT) is labelled with its short name only ("CT", "LT", "RT", not "CT-F") and shows the location total as "<front + rear>/<location max>" (for example 61/62) with the smaller "F<front>·R<rear>" line (for example F47·R14) under it; front and rear share the location maximum, so no per-side maximum is drawn that a player could read as a fixed limit; there are no separate FRONT or REAR words on the cell
- **AND** the location's accessible name still spells out the rear face ("<location> armor: <front> of <max>, rear: <rear> of <rear max>")
- **AND** the largest value a face can take is still the location maximum minus the armor the other face currently holds, taken from one shared helper (`getArmorFaceMaximums`); it sets the range of the location editor's Front and Rear controls and is no longer printed on the plate, the table or the editor
- **AND** the location editor uses one header pattern for every location: each control is labelled plainly "Front" or "Rear" (its value sits in the number input beside the slider), no control shows a per-side or per-location "max", and the Total line ("Total 61 / 62", "Total 20 / 42") shows front + rear over the location maximum once
- **AND** the quad, tripod, LAM and QuadVee diagrams use a different cell renderer and keep their existing front/rear display

#### Scenario: Biped plates stay legible and tappable on a phone

- **WHEN** a status-colour biped silhouette (Glow, HUD or Chromatic) renders at 390x844
- **THEN** every SVG text and tspan is at least 12 rendered px, and the plate text, including the "/max" denominators, the rear line and the location names, is at least 14 rendered px (plate text uses 17 viewBox units, shown at about 0.83 px per unit because the figure is 420 units wide and its height is capped to the viewport; the bold values use 22 units)
- **AND** every location plate (head, torsos, arms and legs) is a button at least 44 px wide and 44 px tall; arms, side torsos and legs are drawn wide at their text rows (about 70 to 80 units) so the "<value>/<max>" stack and the rear line never touch the outline
- **AND** the viewBox is cropped to the drawn silhouette ("-30 20 420 402", exported as `BIPED_ARMOR_VIEWBOX` and shared with the style thumbnails) so the cropped height, not wasted margin, sets the scale

#### Scenario: Neck and pelvis read as part of the silhouette

- **WHEN** a status-colour biped silhouette (Glow, HUD or Chromatic) renders
- **THEN** the neck and pelvis are drawn as one structural group filled with the raised surface color, not the dark deep-surface color that read as a hole between the torso and legs
- **AND** no extra bar is drawn behind the legs

#### Scenario: Biped orientation matches the record sheet

- **WHEN** any biped silhouette renders
- **THEN** the unit's Left Arm, Left Torso and Left Leg plates are on the viewer's left and the Right plates on the viewer's right, matching the printed record sheet and MegaMekLab; the Standard style's rear inset keeps the same order (LT, CT, RT from the viewer's left)
- **AND** the plates are focusable in reading order (Head, Left Arm, Left Torso, Center Torso, Right Torso, Right Arm, Left Leg, Right Leg), followed on the Standard style by the rear inset's Left Torso, Center Torso and Right Torso

#### Scenario: Left and Right labels sit under the arms

- **WHEN** a status-colour biped silhouette (Glow, HUD or Chromatic) renders
- **THEN** the words "Left" and "Right" are drawn directly beneath the left and right arm plates, not floating at the top corners of the card

#### Scenario: Location table beside the silhouette

- **WHEN** a status-colour biped silhouette (Glow, HUD or Chromatic) card is at least 40rem wide inside (container query, not viewport width)
- **THEN** the silhouette column (up to 440px) sits beside a compact table of every location with single-line columns "Location", "Front", "Rear" and "Total", centered as a pair so no blank band is left on the card's right
- **AND** Front and Rear read as plain values, Rear shows an em dash for locations without rear armor, and Total reads "<front + rear> / <location max>" (for example "61 / 62", "34 / 34"); the table adds no calculations of its own, never overflows its card, and keeps the card's 16px padding to the right of the last column, so a selected row never touches the card edge
- **AND** each row's location is a button (`aria-pressed` when selected) and clicking anywhere on the row selects or deselects that location exactly like its plate, so the plate, the row and the location editor always agree
- **AND** a single-line 13px note directly under the table header row says "Front + rear share the location max."
- **AND** each row carries a status dot using the plate's health color
- **WHEN** the card is narrower (phones and narrow tablets)
- **THEN** the table is omitted because the plates already show every value, and the figure keeps its viewport-capped height
- **AND** the Standard (Blueprint) diagram never shows this table; it has its own compact location list (see "Standard Blueprint Biped Diagram")

### Requirement: Standard Blueprint Biped Diagram

The Standard silhouette style (`clean-tech`, the default) SHALL draw biped armor as the record sheet's 'Mech outline in a quiet engineering-drawing style (`BlueprintArmorDiagram`), with coverage shown by fill height alone.

#### Scenario: Record-sheet front view and rear inset

- **WHEN** the Standard biped silhouette renders
- **THEN** a FRONT view shows the eight locations using the record sheet's biped outline (`armor_diagram_biped`) mirrored about its centre line, with the centre torso cut around the head's chin, and a REAR view shows the sheet's own rear-torso inset with the three torso plates
- **AND** every plate is inset about 1.6px from the sheet outline so neighbours stay apart, and the fists are faint detail lines inside the arm's button (part of its hit area), never a separate floating shape
- **AND** a faint drafting grid (half the concept's opacity) and a dash-dot centre line sit behind the plates as texture
- **AND** FRONT and REAR are small uppercase tracked section headers with a hairline rule; on cards at least 37.75rem wide inside, a 15rem column beside the 21.5rem front view holds, in order, the REAR inset (12rem, the same scale as the front view), the selection caption, the location list and the key at the column's foot
- **AND** on narrower cards (phones) the views keep record-sheet order: the FRONT view comes first (capped at 19.25rem wide, which keeps plate text at 12px), then the REAR inset directly below (the card is too narrow to set the views side by side without taking plate text under 12px), then the list, then the key; the selection caption moves up to sit directly under the FRONT label, above the drawing, so the tap hint shows on the first screen; there the idle hint starts on the FRONT label's left edge, and the accent bar and its indent appear only while editing
- **AND** there is no status-colour location table and no "Left"/"Right" captions; a screen-reader-only sentence explains the click and keyboard controls

#### Scenario: Fill height is the only coverage encoding

- **WHEN** a front plate renders
- **THEN** it fills from its bottom edge to `points / location max` (torsos use front + rear against the shared location max) in one neutral steel tone (the theme's `--border-default`) over the page navy as the empty tone (`--surface-deep`, darker than the card), so a low location (for example a Left Arm at 12 / 34) reads as missing armor at a glance with the plate outline still visible; both derive from theme tokens so other themes keep working
- **AND** any plate below its max draws a 1.5px cream level line edge to edge at its fill height (for example the legs at 41 / 42); a full plate draws none
- **AND** rear inset plates fill the same way, to their location's `total / location max` (front and rear share one maximum), in the same filled and empty tones and with the same level line, so a normal rear allocation never reads as empty and "Fill = Points of Max" holds for both views
- **AND** coverage never uses a status hue: fill and level stay neutral at every percentage; those colours keep their equipment-category and status meanings elsewhere
- **AND** front torso plates carry no hatched rear band
- **AND** plate text carries a thin dark halo so a level line passing under a label never cuts through it, and text over the empty tone holds at least 4.5:1

#### Scenario: Plate labels

- **WHEN** a front plate renders
- **THEN** it shows its code (HD, CT, LT, RT, LA, RA, LL, RL), then the location's armor as "<total> / <max>" with the value bold and " / <max>" lighter, with spaces around the slash; front torso plates add "F <front>" underneath
- **AND** each rear inset plate shows its code and "R <rear>" set in exactly the same size, weight and tone as the front torso plates' "F <front>" line
- **AND** all drawn text is Arial/Helvetica with tabular numerals and renders at 12px or more at 1440x900 and on a 390px phone (the views draw at about 1.93 px per viewBox unit)
- **AND** the secondary "/ <max>" and "F <front>" text holds at least 5.5:1 contrast on the filled tone and all other plate text at least 4.5:1 on what is behind it

#### Scenario: Rear plates select their location

- **WHEN** the user clicks a rear inset plate or presses Enter or Space on it
- **THEN** that torso location is selected exactly as from its front plate
- **AND** hovering, focusing or selecting a location lights its plate in both views together

#### Scenario: Totals stay in the header

- **WHEN** the Standard biped diagram renders, with or without a selection
- **THEN** the diagram shows no armor total, armor type or tonnage; the tab's summary bar ("Allocated: <n> / <max>") and the header stat strip (ARMOR <n> / <max>) remain the totals and stay visible during selection

#### Scenario: Selection caption

- **WHEN** nothing is selected
- **THEN** the caption slot under the rear inset (under the FRONT label on a phone) reads "Select a location or row to edit" in secondary text (a verb that fits mouse and touch) with no accent bar, naming both the plates and the list rows as controls
- **WHEN** a location is selected
- **THEN** both of its plates take a 2px accent (`--accent-primary`) edge and the caption reads "Editing <location name>" (for example "Editing Center Torso") in primary text behind a 2px accent bar, announced politely
- **AND** there is no SELECTED readout panel; the inspector shows the front / rear split and percentage

#### Scenario: Location list

- **WHEN** the Standard biped diagram renders
- **THEN** a compact list under the caption has the header row "Location · Front · Rear · Total" (small uppercase tracked secondary labels) and one row per location in record-sheet order (HD, CT, LT, RT, LA, RA, LL, RL): the code, the front points, the rear points or "—" for locations without rear armor, and "<total> / <max>" with the total bold, all in tabular numerals with the numbers right-aligned
- **AND** each row is a button named "<location>: front <front>[, rear <rear>], total <total> of <max>" with `aria-pressed` while selected; clicking it selects or deselects the location exactly like its plates
- **AND** rows share the plates' states: hovering a row or a plate lights both, and the selected row takes the same 2px accent edge as its plates
- **AND** rows are at least 28px tall on desktop and 44px on a phone or coarse pointer
- **AND** a row whose location the unit's validation flags carries the same warning or error icon after its code as its plates (see "Low-armor marks"), and its name ends ", low armor warning" or ", critical armor error"

#### Scenario: Fill key

- **WHEN** the Standard biped diagram renders
- **THEN** its key shows a plate swatch filled part-way with its level line and "Fill = Points of Max", then "F Front · R Rear" explaining the plate sub-values, in Title Case

#### Scenario: Plate states and keyboard

- **WHEN** the user points at or tabs to plates
- **THEN** at rest every plate outline is drawn brighter than the drafting lines (`--border-strong` mixed 80% with `--border-default`) so the plates read as controls; plates show a pointer cursor; hover draws a 2px cream edge with a slight fill lift and lights the partner plate in the other view and its list row
- **AND** keyboard focus (`:focus-visible` only) draws a dashed 2px cream ring about 2px outside the plate, distinct from the hover and selected edges
- **AND** every plate is a focusable button named "<location> armor: <total> of <max> points" (rear plates "<location> rear armor: ..."), with ", front <front>, rear <rear>" added for torsos, and `aria-pressed` while selected
- **AND** Tab moves through the plates, Enter or Space selects or deselects, the arrow keys move focus to the spatially adjacent plate within a view (Head down to Center Torso, the torsos and arms across, the legs below), and Escape closes the editor through the panel's existing select-again toggle when a location is selected

#### Scenario: Low-armor marks

- **WHEN** the unit's validation (VAL-UNIV-013, the result that drives the tab's issue banner) warns that a location has low armor, for example "Left Arm has low armor (12/34, 35%)", or reports critical armor as an error
- **THEN** that location's plates in both views draw a 2px edge in the warning colour (`--warning`, orange, never the amber accent) or the error red, with the app's solid warning triangle or error circle beside the plate code (the icon and code centre on the plate together), and each plate's name ends ", low armor warning" or ", critical armor error"
- **AND** a low rear face (for example "Center Torso Rear has low armor") marks its torso; an error wins over a warning on the same location
- **AND** the marks use the app's existing results only; the diagram adds no threshold of its own, and this is the only place the Standard drawing uses a status colour
- **AND** hover and selection still take the plate edge (cream and amber) while the icon stays

#### Scenario: Plate targets

- **WHEN** the Standard diagram renders at 1440x900 or 390x844
- **THEN** every front and rear plate is at least 24px (desktop) and 44px (phone) in its smaller dimension

#### Scenario: Armor tab column split

- **WHEN** the Armor tab shows the Standard biped silhouette at xl or wider
- **THEN** the diagram column is at least 40rem (`minmax(40rem,1.25fr)`) beside the inspector (`minmax(19rem,1fr)`), so the front view and the 15rem rear column fit side by side; other styles keep the wider `1.7fr / 0.8fr` split for their location table
- **AND** both cards stretch to one row height and end on the same bottom edge; the inspector's Advanced Allocation Details start open, so with nothing selected the inspector's content runs to its foot rather than leaving an empty band

### Requirement: Location Color Coding

The system SHALL color each armor location by how full it is, using four clearly distinct health colors owned by `src/constants/armorStatus.ts`. The Standard biped silhouette is the exception: it shows coverage by fill height in one neutral tone (see "Standard Blueprint Biped Diagram").

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

The system SHALL include a legend explaining color coding. The Standard biped silhouette instead shows one key, "Fill = Points of Max" with "F Front · R Rear", once inside its card.

#### Scenario: Legend display

- **WHEN** a status-colour diagram is rendered
- **THEN** legend is introduced by "Armor % of max:" and shows the four health colors with their thresholds (60%+, 40%+, 20%+, <20%)
- **AND** on phones the legend text is 14px and shows the lead-in as "% of max:" (the word "Armor" stays in the accessible text) so the legend fits one line and the footer stays above the Loadout bar
- **AND** the swatches use the same colors as the diagram fills
- **AND** the biped diagram explains click interaction once, in its caption ("Matches the record sheet · left side on the left · click a location to edit"), with the keyboard instruction (Tab to a location, then press Enter) kept as screen-reader-only text
- **AND** the biped diagram has no separate footnote or bottom instruction line

#### Scenario: Legend and unallocated footer placement

- **WHEN** a status-colour biped silhouette (Glow, HUD or Chromatic) renders below the xl breakpoint (phones and tablets)
- **THEN** a footer inside the diagram card shows "Unallocated: <n> points" (or "Over allocated" in red when negative), the "F = front · R = rear armor" key and the four-color legend
- **AND** the SVG height is capped by the viewport (`100dvh - 31rem`, never below 20rem) so on a 390x844 phone the footer sits fully above the Loadout bar without scrolling
- **WHEN** it renders at xl or wider in the Armor tab
- **THEN** the diagram's footer is hidden and the armor inspector card ends with the legend (on its own line) and the "F = front · R = rear armor" key instead; the Unallocated Armor Points row already in the inspector is the single unallocated readout
- **AND** configurations and views that keep their built-in legend (quad, tripod, LAM, QuadVee, schematic) are unchanged
- **WHEN** the Standard biped silhouette renders at any width
- **THEN** neither the diagram nor the inspector shows the "Armor % of max" colour legend, the "F = front · R = rear armor" line or an unallocated footer; the inspector's Unallocated Armor Points row is the single unallocated readout

### Requirement: Armor Inspector Controls

The Armor Inspector SHALL present the armor budget controls in the shared control styles and palette, saying each fact once.

#### Scenario: Armor Tonnage stepper

- **WHEN** the inspector shows Armor Tonnage
- **THEN** it is one joined minus | value | plus control with the Structure tab's stepper classes, the value reading "<tonnage to one decimal> t" (for example "19.0 t") to match the summary bar
- **AND** the field keeps the user's typed text while focused, commits each edit as before (clamped to 0 through the max useful tonnage), and shows the formatted value again on blur

#### Scenario: Maximize Tonnage states its outcome

- **WHEN** the armor tonnage is below the smallest half ton that covers the chassis maximum
- **THEN** the button reads "Maximize Tonnage (+<tonnes> t, +<points> pts)", where the points are only those the chassis can still take (for example an Atlas at 19.0 t reads "Maximize Tonnage (+0.5 t, +3 pts)": 19.5 t buys 312 points but 307 fit)
- **WHEN** the tonnage already covers the chassis maximum
- **THEN** it reads "Maximize Tonnage" and is disabled

#### Scenario: Unavailable actions

- **WHEN** Maximize Tonnage or Auto Allocate is disabled
- **THEN** it uses the shared disabled-button style (solid 1px default border, transparent background, secondary text at 85% opacity, `not-allowed` cursor, no hover change; never dashed)
- **AND** a disabled Auto Allocate always shows its reason directly under it in secondary text, linked with `aria-describedby`: "All points assigned" when no points are unallocated, "All allocatable points assigned" when points remain that the chassis cannot take, or "Read-only: armor cannot be changed."
- **AND** Maximize Tonnage and a zero-point Auto Allocate share one secondary-button style: a strong 1px outline on the card with no fill and primary text; only an Auto Allocate with points to place takes the amber fill

#### Scenario: Inspector readouts

- **WHEN** the armor inspector shows its Unallocated Armor Points row and Advanced Allocation Details
- **THEN** a positive unallocated count (points bought but not placed) is in the warning colour with the warning icon, a negative count is red with the error icon, and 0 stays primary text; Wasted Armor Points uses the warning colour and icon too; none of them uses the amber accent
- **AND** each armor fact appears once: the armor type, its points per ton (as "16 pts/ton" in the Armor Type options) and its slots ("0 slots") live in the inspector's Armor Type field, so neither the summary strip nor the Advanced Allocation Details repeat them
- **AND** the Advanced Allocation Details disclosure spans the inspector width with its chevron at the far right, like the app's other disclosures

#### Scenario: Front and rear colours

- **WHEN** the location editor shows front and rear sliders and the total bar
- **THEN** front uses the cream text tone (`--text-primary`) and rear the secondary text tone (`--text-secondary`) consistently across the slider fill, the label and the total bar, with unfilled tracks in `--surface-raised` (in `--surface-deep` when the editor is embedded in the inspector, whose panel is `--surface-raised`); no off-palette hue (such as sky blue, which sits near actuator blue and heat-sink cyan) is used

### Requirement: Configuration-Specific Diagram Components

The system SHALL render different diagram components based on mech configuration.

#### Scenario: Diagram component selection

- **WHEN** armor diagram is rendered
- **THEN** system SHALL select diagram component based on unit configuration
- **AND** BIPED SHALL use BlueprintArmorDiagram for the Standard silhouette and BipedArmorDiagram for the other silhouette styles
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

