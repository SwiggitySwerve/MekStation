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
- **THEN** Walk, Run and Jump MP share one "Movement" cell that reads "walk / run / jump" (e.g., "4 / 6 / 0"); from 1280px each number is followed by its word on the value line ("4 walk / 6 run / 0 jump"), so the tracked-caps label stands alone
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
- **AND** the strip has seven readouts at one value size: Weight, Slots, Heat, Armor, Movement, Engine and BV; Movement, Engine and BV show the value alone, level with the budget values, without a bar
- **AND** labels are 12px uppercase; caps (e.g., "/100t", "/78", "/22") are at least 13px and captions are at least 12px, so no secondary text in the strip is smaller than 12px on phones; no qualifier sits beside a label: the words naming each number ("dissipation", "walk", "run", "jump") are full words, never abbreviations, and follow their number on the value line in 13px regular secondary text, the same size as the "t" after a tonnage, so the strip keeps one height and its labels, values and bars stay level
- **AND** from 768px to 1023px group columns are proportional to their cell counts (capacity 4, movement and engine 2, BV 1) so every cell has the same width, with a 1px rule between every pair of adjacent cells, not only the groups
- **AND** from 1024px the strip is one 38px line of "LABEL value" pairs, each at its natural width, the label on the value's baseline and any bar under the value; the first pair starts on the page's 16px left edge (the card column's left edge), and every pair is set off by a 1px hairline with 16px on either side, so the strip neither stretches at 1440px nor crowds at 1024px; on touch screens the explained readouts keep 44px targets and the strip grows to fit them
- **AND** the Movement words show from 1280px so the readouts never crowd
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
- **AND** while mounted equipment is not placed in critical slots the value counts placed slots only (66 / 78 when a 3-slot PPC is still unplaced, not 69 / 78), in the normal hue (the unplaced item is already the Unplaced Equipment error, so the slot budget is not a second one) with a hover and focus tooltip "66 of 78 slots filled · 3 pending (1 unplaced item)."; the placed and pending counts come from `getSlotPlacementSummary` (`slotOperations/placement.ts`) through `useUnitEditorRoutingStats`, and over capacity the value keeps the full demand in red

#### Scenario: Armor stat with capacity format

- **WHEN** armor stat renders
- **THEN** label shows "ARMOR"
- **AND** value shows "allocated / maximum" format (e.g., "200 / 350")
- **AND** maximum is calculated from tonnage (2 × internal structure points)

#### Scenario: Heat stat with balance format

- **WHEN** heat stat renders
- **THEN** label shows "HEAT"
- **AND** value shows "generated / dissipation" format (e.g., "15 / 10"), and from 1280px the full word "dissipation" follows the cap on the value line ("15 / 10 dissipation", as on the Overview heat card); the "Heat" label names the generated value
- **AND** the heat readout is always keyboard focusable, with an accessible name and a hover/focus explanation naming both numbers (e.g., "15 heat at full fire / 10 dissipation")
- **AND** value text and fill bar are in the warning hue (orange) if generated exceeds dissipation, because running hot is legal but worth fixing and the build status lists it as a warning in that hue; the readout does not repeat the excess as its own pill
- **AND** the Overview Heat readout shows only the numbers (e.g., "33 / 22 dissipation", "31 from weapons + 2 from running") with the generated value in the same state color; the Overview Heat readiness row states what running hot means, so the readout does not repeat "+11 over"; the caption uses the weapon and movement subtotals exposed by CalculationService, naming running or jumping as calculated
- **AND** when running hot the explanation adds how far heat is over and that this is legal (e.g., "5 over: legal; add heat sinks to run cool.")
- **AND** red is reserved for construction errors such as overweight or over slots
- **AND** value text uses neutral primary color when dissipation meets or exceeds generation (in-budget states are not accent-highlighted, per command-screen focus doctrine)

#### Scenario: Optional Run+ stat handling

- **WHEN** unit has maxRunMP > runMP
- **THEN** the Movement cell adds the top run speed in parentheses after Run (e.g., "4 / 6 (8) / 0", test id `unit-info-stat-run-plus`), its words read "walk", "run" and "jump" (the top speed sits between run's number and its word), and its accessible name adds it (e.g., "run 6 (8 with enhancement)")
- **AND** the strip keeps its seven cells
- **WHEN** unit does NOT have enhanced run
- **THEN** no top run speed is shown

### Requirement: Stat Cell Styling

Each statistic cell SHALL use one consistent layout with clear labeling.

#### Scenario: Cell structure

- **WHEN** stat cell renders
- **THEN** label is uppercase (secondary text, text-xs, font-medium)
- **AND** value is text-lg, font-bold, in its state color
- **AND** below 1024px the label sits above the value and the cell is centered (gap-0.5); from 1024px the label leads the value on one baseline, 8px apart

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
- **AND** the headline omits empty groups and joins the rest worst first with " · " (e.g., "1 error · 1 warning · 1 note"); a lone readout warning reads as itself (e.g., "Runs Hot +11"), and a unit with nothing to report reads "Ready" with a green check
- **AND** the build status is one button showing that headline, each group in its own severity color after the worst group's icon, with that worst severity tinting the button's border
- **AND** its accessible name contains the full panel heading, the readout warnings by name when the headline only counts them, and what it opens (e.g., "Atlas AS7-D: Not Legal · 1 error · 2 warnings (Runs Hot +26), show issues"; "Atlas AS7-D: Legal · Runs hot +11, show issues"; "show checks" when only notes or save details are listed)
- **AND** it opens one panel led by "Not Legal" or "Legal", never a green "all rules pass" line above a warning; the verdict is a label followed by the counts in the status button's own format, each in its severity colour after a "·" separator with no pill (e.g., "Not Legal · 2 errors · 1 warning", or "Legal · Runs Hot +11" or "Legal · Ready" when that is the whole headline), kept on one line when they fit; each count wraps as a whole when needed; the panel's accessible name keeps the "Not legal · <headline>" wording
- **AND** the panel header has two lines: the unit name small and muted on one line ending in an ellipsis (its tooltip shows the full name), then the "Build Status" heading, so no separator or fragment sits alone on a line
- **AND** the panel lists errors, then warnings (rule warnings first, then readout warnings such as running hot), then notes, each under its own label followed by its one-line definition (e.g., "Errors — the unit is not legal until fixed"); each item shows its severity icon, a 16px semibold plain heading with no closing full stop (e.g., "Overweight by 3.0 t", "ER PPC needs a location", "Runs 11 heat over dissipation"), the existing validation message and suggestion as 14px explanation (overweight states its amount once, in the heading, so its explanation is the shared fix sentence alone, `OVERWEIGHT_FIX` "Remove equipment or armor.", the same sentence its readiness row ends with), and one 44px quiet "Go to <tab>" text button (label and arrow, outlined only on hover or focus) for the tab that fixes it first, lighter than the issue text it follows
- **AND** each issue's link is its first fix tab (`getPrimaryFixTab`), the same single link its Overview readiness row offers, so the two lists never offer different link sets: weight issues go to Equipment; other issues go to their category's tab
- **AND** the section tab badges count each issue on the first tab that fixes it (`getPrimaryFixTab`), so an overweight unit marks Equipment rather than Structure; the badges are named with their tab (e.g., "Equipment: 1 error")
- **AND** the Overview "Build Readiness" Slots row is about slots only: it says how many slots placed equipment fills and how many are free ("66 of 78 slots filled, 12 free.", also while an item is unplaced), passes with the green check unless the slots are over capacity (an error), and never names unplaced items; the Unplaced Equipment row alone carries the placement error, so the same item never counts twice; the header and readiness row reuse the placement counts and `getSlotFillStatus` from the existing owners
- **AND** a failing readiness row with one issue takes that issue's status panel title from the same helpers (`describeIssue` for rule results, `noteHeading` for readout warnings), so an issue has one name in both places ("Overweight by 7.0 t", "PPC needs a location", "Runs 11 heat over dissipation"); its sentence then leaves out what the title says ("Over the 100.0 t limit. Remove equipment or armor.", "Takes 3 slots. Not legal until placed.", "Legal, but add heat sinks to run cool."); passing rows, and rows holding several issues, keep their own label (Weight, Slots, Armor, Heat, Unplaced Equipment)
- **AND** the Overview "Build readiness" rows use the same severity icons and colors: a readout over its cap and unplaced equipment are errors, a legal-but-high readout (running hot) and other rule warnings are warnings; all readiness lists order errors before warnings, then notes and passing rows, through `buildReadiness.ts`; each row's action is a quiet link-style button (the tab name and a chevron, outlined only on hover or focus, at least 44px tall) named "<row>: go to <tab>"; the compact phone issue card places "Go to <tab>" beside its title and one-line reason, retaining the full reason in accessible text and a tooltip
- **AND** the running-hot message SHALL explain the generated total with calculated weapon and movement subtotals (e.g., "Heat 33 at full fire (31 from weapons + 2 from running) vs 22 dissipation: 11 over."); the header heat tooltip SHALL include the same subtotals and movement mode
- **AND** the running-hot warning is a presentation tier: it is counted, worded and colored with the warnings but it is not a validation result, never makes the unit invalid and never changes what the validator reports; it links to the Structure tab where heat sinks are set
- **AND** on desktop the panel opens as a right-side drawer docked over the Loadout rail column (the larger of the rail width and 320px, aligned with the rail's right edge, full height below the header; 320px at the right edge when the rail is hidden or collapsed), with a left edge shadow; while it is open the tab content is padded by the part of the workspace the drawer covers (`--status-drawer-push`), so the content reflows beside it, stays undimmed and is never cut mid-word underneath; issue links follow their reason inline where space permits; a press outside, Escape or the close button closes it, and Escape or the close button return focus to the status button
- **WHEN** the workbench renders on desktop
- **THEN** the unit bar is 48px tall from 768px: the MekStation menu, then the unit tabs with Add Unit directly after the last tab (browser style; its plus is icon-only below 1280px, "Add Unit" beside it from 1280px), then a flexible space, then one right-hand group in this order: the save state, the Save button, the "…" Unit Actions button and the loadout panel toggle; opening more unit tabs moves Add Unit but never the right-hand group
- **AND** every visible gap in the right-hand group is 24px (within 1px): the save state to the Save button, the Save button to the "…" glyph and that glyph to the toggle's glyph; the save state's caps sit on the Save label's midline
- **AND** Add Unit, the "…" button and the loadout panel toggle are ghost icon buttons: 44px targets with a 24px symbol and no border or fill at rest; the toggle shows its pressed state (`aria-pressed`) as an accent-tinted fill and accent symbol, and its right edge lines up with the Loadout rail's controls and the status chip below it
- **AND** the section bar is 45px tall: the section tabs keep their natural widths (16px either side of the label), left-aligned so the first label shares the page's 16px left edge; the active tab is accent text on a 2px accent underline with no fill, and other tabs brighten their text on hover
- **AND** on the wide section bar the build status button sits in a fixed slot at least 240px wide over the Loadout rail column, flush with the right edge, with a 1px divider continuing the rail's; undo and redo are ghost icon buttons (44px, no border, a dimmed symbol when unavailable) that end at that divider, so the section tabs never move when the status wording changes width
- **AND** beside the Save button a single line at 13px spells out where the work is, library words first: "Not in Library · Draft Saved" or "Changed Since v3 · Draft Saved" once the browser draft has been written or an existing stored draft is restored (detected read-only through the existing storage owner), "Not in library" before any draft exists, "In library v3" alone when the unit matches its library copy, or a red "Browser draft not saved · Retry" when the latest browser write failed, even if an older stored draft exists; the one-line form has no leading check, but "Draft Saved" carries its own check icon; each automatic draft save is confirmed here, not in a toast, by showing "Draft Saved" and its check in the OK green for 1.5s (the check stays at rest in the line's colour, so the flash never shifts the line); the line truncates at about 224px and its tooltip carries the long wording ("Draft saved in browser." and the save explanation)
- **AND** the Save button is labelled "Save to Library" (accessible name "Save active unit to library"); from 1024px it is a compact button 36px tall with a 16px symbol (44px tall on touch screens), and below 1024px a 44px icon-only target with a 24px symbol; it is the primary action while the unit is not in the library or has changed since its library save, and quiet once the unit matches its library copy; it carries no dot; it is the active unit's only unsaved marker (unit tabs mark background units only, with a dot named "Changes not saved to library"); its accessible description repeats the library wording (plus "Draft saved in browser" once written), and its instant hint gives the explanation ("Your changes are kept in this browser. Use Save to add the unit to your library…")
- **AND** the "…" button (accessible name "Unit Actions") and the loadout panel toggle (accessible name "Hide Loadout Panel", pressed while the panel is hidden) show instant hints naming what they do
- **AND** the status panel's Saving section lists the draft line, then the library line (an unwritten draft is not listed), then the explanation
- **WHEN** the workbench renders on a phone
- **THEN** the build status is a 44px chip at the right edge of the budget stat strip, after the key readouts and the expand control, so the header stays one 48px row and the chip's chevron never sits beside the expand control's; it shows severity symbols and counts alone at 13px with a visible chevron and no plural noun that could read as "1 Issues" (e.g., "⊗2 ⚠1 ›", or "⚠ Runs Hot +11 ›" shown in full with a full word space before the amount, never cut, with "✓ Ready" when passing); every state ends with the same chevron, opens the same status sheet, and its accessible name and tooltip keep the full summary in words; values stay at 15px or larger (18px from 381px wide) and denominators at least 13px without wrapping
- **AND** the phone stat-strip expand control SHALL be named "More stats (Armor, Movement, BV)" ("Fewer stats (Armor, Movement, BV)" when expanded), and SHALL show a visible 12px uppercase "More" ("Less") label above its chevron, styled like the stat labels it sits beside
- **AND** phone helper text in the status sheet (group definitions, the Saving explanation) is at least 13px
- **AND** the unit name shows once, inside its unit tab, on one line ending in an ellipsis when it does not fit; below 640px the tab drops its tech base badge (the tab tooltip still names the tech base) and the gaps around the unit commands close up, so a name such as "Atlas AS7-D (Danielle)" fits at 390px; the header symbols (MekStation menu, Add Unit, Unit Actions, Save) keep their 24px size within 44px targets, as on desktop (where only the labelled Save uses a 16px symbol), so the Add Unit plus and the Save glyph each draw at least 20px; the tab's accessible name and tooltip keep the full name and the Overview Identity card shows it in full; there is no separate name line under the header
- **AND** the workspace scroll area ends where the fixed Loadout bar begins (bar height plus the bottom safe area) on every tab, so no content renders under the bar, and the bar casts a shadow over the content above it
- **AND** below 640px the panel opens as a bottom sheet with a grab handle over a dimmed backdrop (60% black; pressing it closes the sheet), at most 80% of the dynamic viewport height, scrolling inside, with 16px of bottom padding plus the device's bottom safe-area inset so its last section (Saving) never runs to the screen edge; its Saving section uses the same wording as the header ("Draft Saved", with "Not in Library" under it), and a failed browser draft write still appears as a visible line with a retry action
- **AND** on phones the Save icon button carries no dot: below 1024px, wherever Save is icon-only, it is an amber outline with an amber icon while the unit needs a library save and a plain icon once it matches; the words appear in the status sheet's Saving section and, from 640px, on one line in the section band ("Not in Library · Draft Saved")

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
