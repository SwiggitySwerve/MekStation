# unit-info-banner Specification

## Purpose

Defines Unit Info Banner requirements for Fixed Banner Layout, Unit Identity Display, Statistics Grid, and Stat Cell Styling, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

## Requirements

### Requirement: Fixed Banner Layout

The Unit Information Banner SHALL render as a fixed header below the tab bar.

#### Scenario: Banner positioning

- **WHEN** customizer renders
- **THEN** banner appears at top of content area
- **AND** banner has slate-800 background with bottom border
- **AND** banner does not scroll with content

#### Scenario: Three-section layout

- **WHEN** banner renders
- **THEN** left section shows unit identity
- **AND** center section shows statistics grid
- **AND** right section shows action buttons

### Requirement: Unit Identity Display

The banner SHALL display unit name and basic classification on the left.

#### Scenario: Identity rendering

- **WHEN** unit is loaded
- **THEN** chassis name appears as xl font bold heading
- **AND** subtitle shows tonnage-ton techBase unitType format
- **AND** text is slate-100 (heading) and slate-400 (subtitle)

### Requirement: Statistics Grid

The banner SHALL display key unit statistics in a balanced grid using BalancedGrid component for even row distribution.

#### Scenario: Movement stats display

- **WHEN** movement stats render
- **THEN** Walk, Run and Jump MP share one "Movement" cell that reads "walk / run / jump" (e.g., "4 / 6 / 0"), with a "walk / run / jump" caption beside the label on wide screens
- **AND** each part keeps its own test id (`unit-info-stat-walk`, `unit-info-stat-run`, `unit-info-stat-jump`) and the cell's accessible name spells the parts out (e.g., "Movement: walk 4, run 6, jump 0 MP")

#### Scenario: BV and Engine stats display

- **WHEN** single-value stats render
- **THEN** BV appears first with neutral primary text color
- **AND** ENGINE appears second with neutral primary text color
- **AND** both use SimpleStat component
- **AND** neither uses a decorative accent hue (per command-screen focus doctrine, color is reserved for out-of-budget / invalid states)

#### Scenario: Budget readouts lead the strip

- **WHEN** the compact workbench strip renders
- **THEN** Weight, Slots, Heat and Armor form the Capacity group, and each shows a 3px fill bar under its value, filled by use against its cap (clamped at full) and colored neutral, the note hue (legal but high) or red by the same state as its value
- **AND** readout state colors come from one owner (`unitStatStatus.ts`, taking its hues from the severity colors in `BuildStatusLabel.tsx`) shared by the banner, the Overview Heat readout and the mobile loadout header: a legal-but-high value (running hot) is sky blue, the same note hue the build status, panel and readiness rows use for that condition, distinct from the amber accent that marks the selected tab and primary actions, and red is reserved for errors
- **AND** the strip has seven evenly spaced cells at one value size: Weight, Slots, Heat, Armor, Movement, Engine and BV; Movement, Engine and BV show the value alone, level with the budget values, without a bar
- **AND** labels are 12px uppercase; caps (e.g., "/100t", "/78", "/22") and captions are at least 12px, so no secondary text in the strip is smaller than 12px on phones
- **AND** group columns are proportional to their cell counts (capacity 4, movement and engine 2, BV 1) so every cell, and every gap between groups, has the same width
- **AND** tonnage is not repeated as its own readout, because the Weight cap shows it

#### Scenario: Weight stat with capacity format

- **WHEN** weight stat renders
- **THEN** label shows "WEIGHT"
- **AND** value shows "usedTonnage / tonnage" format (e.g., "45.5t / 50t"), the cap being the unit's tonnage
- **AND** value text is red if used exceeds max (overweight)
- **AND** value text is neutral when used is at or under max (using the full tonnage is normal)
- **AND** value text is white/normal otherwise

#### Scenario: Critical slots stat with capacity format

- **WHEN** critical slots stat renders
- **THEN** label shows "SLOTS"
- **AND** value shows "used / total" format (e.g., "16 / 78")
- **AND** total is 78 for standard BattleMech
- **AND** value text is red if used exceeds total

#### Scenario: Armor stat with capacity format

- **WHEN** armor stat renders
- **THEN** label shows "ARMOR"
- **AND** value shows "allocated / maximum" format (e.g., "200 / 350")
- **AND** maximum is calculated from tonnage (2 × internal structure points)

#### Scenario: Heat stat with balance format

- **WHEN** heat stat renders
- **THEN** label shows "HEAT"
- **AND** value shows "generated / dissipation" format (e.g., "15 / 10"), and on wide screens a visible "gen / diss" caption beside the label names the two numbers
- **AND** the heat readout is always keyboard focusable, with an accessible name and a hover/focus explanation naming both numbers (e.g., "15 heat at full fire / 10 dissipation")
- **AND** value text and fill bar are in the note hue (sky blue) if generated exceeds dissipation, because running hot is legal and the build status lists it as a note in that hue; the readout does not repeat the excess as its own pill
- **AND** the Overview Heat readout shows only the numbers (e.g., "33 / 22 dissipation", "at full fire") with the generated value in the same state color; the Overview Heat readiness row states what running hot means, so the readout does not repeat "+11 over"
- **AND** when running hot the explanation adds how far heat is over and that this is legal (e.g., "5 over: legal; add heat sinks to run cool.")
- **AND** red is reserved for construction errors such as overweight or over slots
- **AND** value text uses neutral primary color when dissipation meets or exceeds generation (in-budget states are not accent-highlighted, per command-screen focus doctrine)

#### Scenario: Optional Run+ stat handling

- **WHEN** unit has maxRunMP > runMP
- **THEN** the Movement cell adds the top run speed in parentheses after Run (e.g., "4 / 6 (8) / 0", test id `unit-info-stat-run-plus`), its caption reads "walk / run (max) / jump", and its accessible name adds it (e.g., "run 6 (8 with enhancement)")
- **AND** the strip keeps its seven cells
- **WHEN** unit does NOT have enhanced run
- **THEN** no top run speed is shown

### Requirement: Stat Cell Styling

Each statistic cell SHALL use consistent vertical layout with clear labeling.

#### Scenario: Cell structure

- **WHEN** stat cell renders
- **THEN** label appears at top in uppercase (slate-400, text-xs, font-medium)
- **AND** value appears in middle (text-lg, font-bold, appropriate color)
- **AND** cell is centered with appropriate spacing (gap-0.5)

#### Scenario: Capacity format display

- **WHEN** stat shows "current / max" format
- **THEN** both values appear with " / " separator
- **AND** current value inherits color based on status (normal/warning/error)
- **AND** max value appears in 12px secondary text, legible on wide and phone layouts
- **AND** format emphasizes current value over max

### Requirement: Validation Status Indicator

The banner SHALL display unit validation status.

#### Scenario: Valid unit display

- **WHEN** unit passes all validation and has no notes
- **THEN** the build status reads "Ready" in neutral text with a green check

#### Scenario: One build-status button in the workbench

- **WHEN** the workbench section bar renders
- **THEN** issue counts and their wording come from one owner (`buildStatusSummary.ts`), which takes the validation counts and the readout notes (`getStatusNotes` in `unitStatStatus.ts`), so the header status button, the status panel heading, the phone status button and the Overview "Build readiness" header always report the same totals; the readiness header shows the counts only (e.g., "1 note", "1 error ? 1 warning ? 1 note"), because the header status button and the readiness rows already name a lone note such as running hot
- **AND** the vocabulary is errors ("the unit is not legal until fixed"), warnings ("legal, but likely a mistake") and notes ("legal; for your information": info-level rule results and readout notes such as running hot)
- **AND** each severity has one color and one icon on every surface (status button, panel, Overview readiness rows and section-tab dots), owned by `BuildStatusLabel.tsx`: errors red with a crossed circle, warnings yellow with a triangle, notes sky blue with an info circle
- **AND** the headline omits empty groups and joins the rest worst first with " · " (e.g., "1 error · 1 warning · 1 note"); a lone readout note reads as itself (e.g., "Runs hot +11"), and a unit with nothing to report reads "Ready" with a green check
- **AND** the build status is one button showing that headline, each group in its own severity color after the worst group's icon, with that worst severity tinting the button's border
- **AND** its accessible name contains the full panel heading, the notes by name when the headline only counts them, and what it opens (e.g., "Atlas AS7-D: Not legal · 1 error · 1 warning · 1 note (Runs hot +26), show issues"; "Atlas AS7-D: Legal · Runs hot +11, show checks")
- **AND** it opens one panel whose heading is "Not legal · <headline>" or "Legal · <headline>", never a green "all rules pass" line above a note
- **AND** the panel lists errors, then warnings, then notes, each under its own label followed by its one-line definition (e.g., "Errors — the unit is not legal until fixed"); each item shows its severity icon, a 16px semibold plain heading (e.g., "Overweight by 3.0 t", "ER PPC needs a location", "Runs 11 heat over dissipation"), the existing validation message and suggestion as 14px explanation, and 44px secondary "Go to <tab>" buttons for the tabs that can fix it
- **AND** weight issues offer Equipment and Armor (`getFixTabsForCategory`); other issues offer their category's tab
- **AND** the section tab dots count each issue on the first tab that fixes it (`getPrimaryFixTab`), so an overweight unit marks Equipment rather than Structure; the dots keep their accessible names (e.g., "1 error")
- **AND** the Overview "Build readiness" rows use the same severity icons and colors: a readout over its cap is an error, a legal-but-high readout (running hot) is a note, unplaced equipment and other rule warnings are warnings
- **AND** the heat note is presentational: it never adds to error or warning counts and never makes the unit invalid; it links to the Structure tab where heat sinks are set
- **AND** while the panel is open a dim scrim covers the workspace behind it; pressing the scrim closes the panel, and Escape or the close button return focus to the status button
- **WHEN** the workbench renders on desktop
- **THEN** the header groups Add unit and the "…" Unit actions button as one quiet secondary group, and the save state with the Save button as the primary group, with no separator rules between them
- **AND** beside the Save button a compact two-part state at 13px spells out where the work is, with the library line in primary text, in the shared wording: "Draft saved in browser" with a check over the library line ("Not in library" or "Changed since v3") once the browser draft has been written, "In library v3" alone (with a check) when the unit matches its library copy, or a red "Browser draft not saved · Retry" when the browser write failed
- **AND** the Save button is labelled "Save to library" (accessible name "Save active unit to library"); it is the primary action while the unit is not in the library or has changed since its library save, and quiet once the unit matches its library copy; it carries no dot; it is the active unit's only unsaved marker (unit tabs mark background units only, with a dot named "Changes not saved to library"); its accessible description repeats the library wording (plus "Draft saved in this browser" once written), and its instant hint gives the explanation ("Your changes are kept in this browser. Use Save to add the unit to your library…")
- **AND** the "…" button (accessible name "Unit actions") and the loadout panel toggle (accessible name "Hide loadout panel", pressed while the panel is hidden) show instant hints naming what they do
- **AND** the status panel's Saving section repeats the same two-part words as the header (an unwritten draft is not listed), then the explanation
- **WHEN** the workbench renders on a phone
- **THEN** the build status shares the budget readout row and keeps words: the worst group's icon and count in words (e.g., "1 error") over a worded count of the remaining items (e.g., "+2 more"), or the lone note itself (e.g., "Runs hot +11", truncating before the amount), at 13px with the count at 12px, within the 48px readout row; its accessible name keeps the full summary
- **AND** phone helper text in the status sheet (group definitions, the Saving explanation) is at least 13px
- **AND** the unit name shows once, inside its unit tab, on one line ending in an ellipsis when it does not fit; the tab's accessible name and tooltip keep the full name and the Overview Identity card shows it in full; there is no separate name line under the header
- **AND** the workspace scroll area ends where the fixed Loadout bar begins (bar height plus the bottom safe area) on every tab, so no content renders under the bar, and the bar casts a shadow over the content above it
- **AND** below 640px the panel opens as a bottom sheet over a scrim, at most 80% of the dynamic viewport height, scrolling inside; its Saving section uses the same wording, and a failed browser draft write still appears as a visible line with a retry action
- **AND** on phones the Save icon button carries no dot: it is filled as the primary action while the unit needs a library save and quiet once it matches; the words appear in the status sheet's Saving section and, from 640px, on one line in the section band ("Draft saved in browser · Not in library")

#### Scenario: Invalid unit display

- **WHEN** unit has validation errors
- **THEN** red dot indicator appears
- **AND** text shows count Errors in red

### Requirement: Action Buttons

The banner SHALL provide quick action buttons on the right side.

#### Scenario: Reset button

- **WHEN** banner renders
- **THEN** Reset button appears with red background
- **AND** clicking opens reset confirmation dialog

#### Scenario: Debug button

- **WHEN** banner renders
- **THEN** Debug button appears with slate background
- **AND** clicking toggles debug panel visibility

### Requirement: Responsive Spacing

The statistics grid SHALL use appropriate spacing between items with responsive overrides.

#### Scenario: Base spacing

- **WHEN** statistics grid renders
- **THEN** gap is 6px (gap prop)

#### Scenario: Desktop spacing override

- **WHEN** viewport is sm breakpoint or larger
- **THEN** gap increases via className="sm:gap-1.5"

### Requirement: Editor Integration

The Unit Info Banner SHALL be rendered as part of the unit editor content in CustomizerContent.

#### Scenario: Banner renders in editor

- **WHEN** a unit is loaded in the customizer
- **THEN** UnitInfoBanner appears below the multi-unit tab bar
- **AND** banner receives unit stats from useUnitStore and useUnitCalculations
- **AND** banner is contained in a slate-900 background with bottom border

#### Scenario: Stats wiring

- **WHEN** UnitInfoBanner renders
- **THEN** name, tonnage, techBase come from useUnitStore
- **AND** walkMP, runMP, totalStructuralWeight, totalHeatDissipation, totalSystemSlots come from useUnitCalculations
- **AND** placeholder values (0) are used for jumpMP, armorPoints, heatGenerated until those systems are implemented

### Requirement: Battle Value Display

The banner SHALL display Battle Value (BV) in the statistics grid.

#### Scenario: BV stat rendering

- **WHEN** statistics grid renders
- **THEN** BV appears as first stat (before ENGINE) in Section 3
- **AND** label shows "BV"
- **AND** value shows formatted number with locale separators (e.g., "1,234")
- **AND** value shows "-" if battleValue is undefined or 0

#### Scenario: BV color styling

- **WHEN** BV stat renders
- **THEN** value text uses the neutral primary color (text-text-theme-primary)
- **AND** the instrument strip relies on layout and label — not a per-stat accent hue — for quick identification (command-screen focus doctrine, principle 9)

#### Scenario: BV reactive updates

- **WHEN** unit configuration changes (armor, equipment, movement, etc.)
- **THEN** BV value updates automatically
- **AND** recalculation uses CalculationService.calculateBattleValue()
