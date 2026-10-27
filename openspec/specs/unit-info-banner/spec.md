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
- **THEN** Weight, Slots, Heat and Armor form the Capacity group, and each shows a 3px fill bar under its value, filled by use against its cap (clamped at full) and colored neutral, the warning hue (legal but high) or red by the same state as its value
- **AND** readout state colors come from one owner (`unitStatStatus.ts`, taking its hues from the severity colors in `BuildStatusLabel.tsx`) shared by the banner, the Overview Heat readout and the mobile loadout header: a legal-but-high value (running hot) is orange (the theme's `--warning` token, kept apart from the amber action accent), the same warning hue the build status, panel and readiness rows use for that condition, and red is reserved for errors
- **AND** the strip has seven evenly spaced cells at one value size: Weight, Slots, Heat, Armor, Movement, Engine and BV; Movement, Engine and BV show the value alone, level with the budget values, without a bar
- **AND** labels are 12px uppercase; caps (e.g., "/100t", "/78", "/22") are at least 13px and captions are at least 12px, so no secondary text in the strip is smaller than 12px on phones
- **AND** group columns are proportional to their cell counts (capacity 4, movement and engine 2, BV 1) so every cell has the same width; from 768px a 1px rule separates every pair of adjacent cells, not only the groups, and the Movement caption shows from 1280px so equal cells never crowd
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
- **AND** while mounted equipment is not placed in critical slots the value counts placed slots only (66 / 78 when a 3-slot PPC is still unplaced, not 69 / 78), in the normal hue (the unplaced item is already the Unplaced equipment error, so the slot budget is not a second one) with a hover and focus tooltip "66 of 78 slots filled · 3 pending (1 unplaced item)."; the placed and pending counts come from `getSlotPlacementSummary` (`slotOperations/placement.ts`) through `useUnitEditorRoutingStats`, and over capacity the value keeps the full demand in red

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
- **AND** value text and fill bar are in the warning hue (orange) if generated exceeds dissipation, because running hot is legal but worth fixing and the build status lists it as a warning in that hue; the readout does not repeat the excess as its own pill
- **AND** the Overview Heat readout shows only the numbers (e.g., "33 / 22 dissipation", "31 from weapons + 2 from running") with the generated value in the same state color; the Overview Heat readiness row states what running hot means, so the readout does not repeat "+11 over"; the caption uses the weapon and movement subtotals exposed by CalculationService, naming running or jumping as calculated
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
- **AND** max value appears in at least 13px secondary text, legible on wide and phone layouts
- **AND** format emphasizes current value over max

### Requirement: Validation Status Indicator

The banner SHALL display unit validation status.

#### Scenario: Valid unit display

- **WHEN** unit passes all validation and has no readout warnings
- **THEN** the build status reads "Ready" in neutral text with a green check

#### Scenario: One build-status button in the workbench

- **WHEN** the workbench section bar renders
- **THEN** issue counts and their wording come from one owner (`buildStatusSummary.ts`), which takes the validation counts and the readout warnings (`getStatusNotes` in `unitStatStatus.ts`), so the header status button, the status panel heading, the phone status button and the Overview "Build readiness" header always report the same totals; the readiness header shows the counts only (e.g., "1 warning", "1 error · 2 warnings"), because the header status button and the readiness rows already name a lone readout warning such as running hot
- **AND** the vocabulary is errors ("the unit is not legal until fixed"), warnings ("legal, but likely a mistake": rule warnings and readout warnings such as running hot) and notes ("legal; for your information": info-level rule results)
- **AND** each severity has one color and one icon on every surface (status button, panel and Overview readiness rows), owned by `BuildStatusLabel.tsx`: errors red with a crossed circle, warnings orange with a triangle, notes sky blue with an info circle; the numbered section-tab badges use the same hues, as one pill shape holding the same symbol and the count (a crossed circle on red for errors, a triangle on orange for warnings); amber stays the action accent (Save, the active tab) and is not used for warnings
- **AND** the headline omits empty groups and joins the rest worst first with " · " (e.g., "1 error · 1 warning · 1 note"); a lone readout warning reads as itself (e.g., "Runs hot +11"), and a unit with nothing to report reads "Ready" with a green check
- **AND** the build status is one button showing that headline, each group in its own severity color after the worst group's icon, with that worst severity tinting the button's border
- **AND** its accessible name contains the full panel heading, the readout warnings by name when the headline only counts them, and what it opens (e.g., "Atlas AS7-D: Not legal · 1 error · 2 warnings (Runs hot +26), show issues"; "Atlas AS7-D: Legal · Runs hot +11, show issues"; "show checks" when only notes or save details are listed)
- **AND** it opens one panel led by "Not legal" or "Legal", never a green "all rules pass" line above a warning; the verdict is a label followed by one chip per count (e.g., "1 error", "2 warnings", or "Runs hot +11" or "Ready" when that is the whole headline), kept on one line when they fit; each chip wraps as a whole when needed; the panel's accessible name keeps the "Not legal · <headline>" wording
- **AND** the panel header has two lines: the unit name small and muted on one line ending in an ellipsis (its tooltip shows the full name), then the "Build status" heading, so no separator or fragment sits alone on a line
- **AND** the panel lists errors, then warnings (rule warnings first, then readout warnings such as running hot), then notes, each under its own label followed by its one-line definition (e.g., "Errors — the unit is not legal until fixed"); each item shows its severity icon, a 16px semibold plain heading (e.g., "Overweight by 3.0 t", "ER PPC needs a location", "Runs 11 heat over dissipation"), the existing validation message and suggestion as 14px explanation, and 44px quiet "Go to <tab>" text buttons (label and arrow, outlined only on hover or focus) for the tabs that can fix it, lighter than the issue text they follow
- **AND** weight issues offer Equipment and Armor (`getFixTabsForCategory`); other issues offer their category's tab
- **AND** the section tab badges count each issue on the first tab that fixes it (`getPrimaryFixTab`), so an overweight unit marks Equipment rather than Structure; the badges are named with their tab (e.g., "Equipment: 1 error")
- **AND** the Overview "Build readiness" Slots row says how many slots are filled by placed equipment ("66 of 78 slots filled, 12 free." or, while an item is unplaced, "66 of 78 slots filled · PPC (3 slots) not placed." with a muted hollow circle labelled "Pending"), stays neutral for unplaced items and is an error over capacity; the Unplaced equipment row alone carries the placement error ("PPC (3 slots) not placed — not legal until placed."), so the same item never counts twice; the header and readiness row reuse the placement counts and `getSlotFillStatus` from the existing owners
- **AND** the Overview "Build readiness" rows use the same severity icons and colors: a readout over its cap and unplaced equipment are errors, a legal-but-high readout (running hot) and other rule warnings are warnings; all readiness lists order errors before warnings, then notes and passing rows, through `buildReadiness.ts`; each row's action is a quiet link-style button (the tab name and a chevron, outlined only on hover or focus, at least 44px tall) named "<row>: go to <tab>"; the compact phone issue card places "Go to <tab>" beside its title and one-line reason, retaining the full reason in accessible text and a tooltip
- **AND** the running-hot message SHALL explain the generated total with calculated weapon and movement subtotals (e.g., "Heat 33 at full fire (31 from weapons + 2 from running) vs 22 dissipation: 11 over."); the header heat tooltip SHALL include the same subtotals and movement mode
- **AND** the running-hot warning is a presentation tier: it is counted, worded and colored with the warnings but it is not a validation result, never makes the unit invalid and never changes what the validator reports; it links to the Structure tab where heat sinks are set
- **AND** on desktop the panel opens as a right-side drawer docked over the Loadout rail column (the larger of the rail width and 320px, aligned with the rail's right edge, full height below the header; 320px at the right edge when the rail is hidden or collapsed), so the tab content stays undimmed; issue links follow their reason inline where space permits; a press outside, Escape or the close button closes it, and Escape or the close button return focus to the status button
- **WHEN** the workbench renders on desktop
- **THEN** the header groups Add unit and the "…" Unit actions button as one quiet secondary group, and the save state with the Save button as the primary group, with no separator rules between them
- **AND** beside the Save button a single line at 13px spells out where the work is, library words first: "Not in library · draft saved" or "Changed since v3 · draft saved" once the browser draft has been written or an existing stored draft is restored (detected read-only through the existing storage owner), "Not in library" before any draft exists, "In library v3" alone when the unit matches its library copy, or a red "Browser draft not saved · Retry" when the latest browser write failed, even if an older stored draft exists; the one-line form has no leading check; the line truncates at about 224px and its tooltip carries the long wording ("Draft saved in this browser." and the save explanation)
- **AND** the Save button is labelled "Save to library" (accessible name "Save active unit to library"); it is the primary action while the unit is not in the library or has changed since its library save, and quiet once the unit matches its library copy; it carries no dot; it is the active unit's only unsaved marker (unit tabs mark background units only, with a dot named "Changes not saved to library"); its accessible description repeats the library wording (plus "Draft saved in this browser" once written), and its instant hint gives the explanation ("Your changes are kept in this browser. Use Save to add the unit to your library…")
- **AND** the "…" button (accessible name "Unit actions") and the loadout panel toggle (accessible name "Hide loadout panel", pressed while the panel is hidden) show instant hints naming what they do
- **AND** the status panel's Saving section lists the draft line, then the library line (an unwritten draft is not listed), then the explanation
- **WHEN** the workbench renders on a phone
- **THEN** the build status is a 44px chip in the budget stat strip, in the column beside the key readouts and before the expand control, so the header stays one 48px row; it shows severity symbols and counts at 13px with a visible chevron and the word "Issues" when up to two groups leave room (e.g., "⊗2 ⚠1 Issues ›", or "⚠ Runs hot +11 ›", with "✓ Ready" when passing), opens the same status sheet, and its accessible name and tooltip keep the full summary in words; values stay at 15px or larger (18px from 381px wide) and denominators at least 13px without wrapping
- **AND** the phone stat-strip expand control SHALL be named "More stats (Armor, Movement, BV)" ("Fewer stats (Armor, Movement, BV)" when expanded)
- **AND** phone helper text in the status sheet (group definitions, the Saving explanation) is at least 13px
- **AND** the unit name shows once, inside its unit tab, on one line ending in an ellipsis when it does not fit; below 640px the tab drops its tech base badge (the tab tooltip still names the tech base) and the unit command icons (Add unit, Unit actions, Save) draw at 20px within 44px targets while the MekStation menu keeps its 24px symbol, so a name such as "Atlas AS7-D (Danielle)" fits at 390px; the tab's accessible name and tooltip keep the full name and the Overview Identity card shows it in full; there is no separate name line under the header
- **AND** the workspace scroll area ends where the fixed Loadout bar begins (bar height plus the bottom safe area) on every tab, so no content renders under the bar, and the bar casts a shadow over the content above it
- **AND** below 640px the panel opens as a bottom sheet with a grab handle over a dimmed backdrop (60% black; pressing it closes the sheet), at most 80% of the dynamic viewport height, scrolling inside; its Saving section uses the same wording, and a failed browser draft write still appears as a visible line with a retry action
- **AND** on phones the Save icon button carries no dot: it is an amber outline with an amber icon while the unit needs a library save and a plain icon once it matches; the words appear in the status sheet's Saving section and, from 640px, on one line in the section band ("Not in library · draft saved")

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
