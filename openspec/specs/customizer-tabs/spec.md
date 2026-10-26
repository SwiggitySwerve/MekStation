# customizer-tabs Specification

## Purpose

Defines Customizer Tabs requirements for Tab Navigation, Tab Component Props, Unit Provider Integration, and Overview Tab, preserving the source-of-truth scope introduced by archived change add-customizer-ui-components.

## Requirements

### Requirement: Tab Navigation

The default BattleMech workbench SHALL provide a tabbed navigation interface
with seven tabs in this order: Overview, Structure, Armor, Equipment, Critical
Slots, Fluff, and Preview. Other unit families SHALL use their per-type tab
registry and conditional tab visibility; registry order is owned by that
per-type definition and may differ from the default workbench order.

**Source**: `src/components/customizer/tabs/CustomizerTabs.tsx::DEFAULT_CUSTOMIZER_TABS`
defines the default workbench order. `src/components/customizer/shared/tabRegistry.tsx::MECH_TABS`
and `::getTabSpecsForUnitType` define the registry-driven surface, including
its separate Preview-before-Fluff order.

#### Scenario: User navigates between tabs

- **WHEN** user clicks on a tab label
- **THEN** the corresponding tab content is displayed
- **AND** the active tab is visually highlighted
- **AND** other tab contents are hidden

#### Scenario: Tab state persistence

- **WHEN** user selects a tab and refreshes the page
- **THEN** the route-backed editor SHALL restore the selected tab from its URL
- **AND** persisted unit/tab state SHALL restore the remembered valid tab when the URL omits its tab segment, without replacing an explicit valid URL selection including Structure

#### Scenario: Phone section selection

- **WHEN** the viewport is narrower than 640px
- **THEN** a 48px-tall row SHALL place the section selector on the left and undo/redo on the right, with at least 44px touch targets
- **AND** the selector SHALL show the full current section label and its position among the available sections
- **AND** opening the selector SHALL disclose all section labels, the selected section, and the existing per-section validation counts
- **AND** selecting a section SHALL use the existing tab change handler and close the disclosure
- **AND** Escape SHALL close the disclosure and restore focus to its trigger; outside pointer interaction or focus leaving the disclosure SHALL also close it
- **AND** save details SHALL be available in the build-status panel, with a failed browser draft write also shown in a visible red banner with Retry
- **AND** the phone build-status control SHALL have its own slot beside the capacity readouts with room for a short status label
- **AND** the active unit tab SHALL show its full name with wrapping as needed
- **AND** the app bottom navigation SHALL be hidden on unit routes below 640px, while the hamburger menu keeps app navigation reachable and the Loadout bar remains at the bottom edge
- **AND** at widths of 640px or greater the existing tablist, tab IDs, and panel associations SHALL remain intact

#### Scenario: Stable section validation indicators

- **WHEN** section validation counts change
- **THEN** each severity SHALL show as a numbered badge whose shape carries the meaning, not color alone: errors a red circle holding the error count, warnings an orange rounded square holding the warning count (the same hues as the build-status button and panel), errors first
- **AND** the badge group's accessible name SHALL name the tab and the counts (e.g., "Equipment: 1 error"), and the section tab's accessible description SHALL include the counts (e.g., "1 error")
- **AND** the indicator slot SHALL keep at least one badge's width when counts change or clear
- **AND** the warning count SHALL include the build-status readout warnings (e.g., running hot) on the tab where they are fixed (Structure for running hot), so the badges agree with the build-status counts
- **AND** hovering the badge or keyboard-focusing its tab SHALL show a tooltip that names the issues behind the count, one line per severity ("1 warning: Runs hot", "2 errors: <title>; <title>"), listing at most four titles before "+N more"; the titles are the status panel's own headings and readout labels on the same tab (`getTabIssueTitles`), the tooltip replaces the native title, and the tab's accessible description carries the same words

#### Scenario: Active tab explains its badge

- **WHEN** the active section has an error or warning badge and is not Overview or Preview
- **THEN** one compact notice sits above that section's content (rendered once by `UnitEditorWithRouting`, not by each tab) with the severity icon, the tooltip words ("1 warning: Runs hot") and, when the tab has exactly one issue, its fix in a few words ("— add heat sinks in Cooling", from the readout note's `action` or the rule's own suggestion), via `getTabIssueNotice` in `tabIssueTitles.ts`
- **AND** a "Show all issues" button in the notice opens the build status panel
- **AND** the notice is hidden on Overview (its readiness rows already list the issues), on Preview, and on tabs without issues, and on Critical Slots while its "items to place" banner is showing (the banner already states the issue and its action); it returns once nothing is waiting to be placed

---

### Requirement: Tab Component Props

Each tab component SHALL accept a readOnly prop to disable editing capabilities.

#### Scenario: Read-only mode

- **WHEN** readOnly is true
- **THEN** all inputs, dropdowns, and buttons are disabled
- **AND** the user cannot modify any values

### Requirement: Unit Provider Integration

Tab components SHALL access unit state through the store context that matches the
unit type being edited, and SHALL NOT assume the BattleMech store
(`useUnitStore` / `UnitStoreProvider`) is present.

A tab component that calls a per-type store hook (`useUnitStore`,
`useVehicleStore`, `useAerospaceStore`, `useBattleArmorStore`, `useInfantryStore`,
`useProtoMechStore`) MUST only be mounted inside the matching store context. Tabs
whose content differs by unit type MUST be implemented as a dispatcher that
switches on the active `UnitType` and renders a per-type component, each of which
reads only its own per-type store — mirroring the `ArmorDiagramForType` pattern.

#### Scenario: Mech tab accesses mech store

- **WHEN** a tab component renders inside the BattleMech customizer
- **THEN** it receives the current unit configuration via `useUnitStore`
- **AND** configuration changes are applied via the mech store actions

#### Scenario: Non-mech tab accesses its own per-type store

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** a tab component renders inside that customizer
- **THEN** it SHALL read state only from that unit type's store context
- **AND** it SHALL NOT call `useUnitStore`
- **AND** rendering the tab SHALL NOT throw a "must be used within a
  UnitStoreProvider" error

### Requirement: Overview Tab

The Overview tab SHALL manage unit identity, basic configuration, tech progression, and provide a summary view.

#### Scenario: Basic Info section

- **WHEN** Overview tab renders
- **THEN** Basic Info section appears at the top
- **AND** Name input field allows editing the unit name
- **AND** Tonnage spinner allows setting tonnage (20-100, step 5)
- **AND** Motive Type dropdown shows Biped, Quad, Tripod, LAM, QuadVee options

#### Scenario: Overview columns end on the same line

- **WHEN** the Overview tab renders on a wide canvas
- **THEN** Identity and Component technology stack in the left column and the Build summary fills the right column
- **AND** the Component technology card stretches to the bottom of the column with its component rows evenly distributed, so both columns end on the same line without an empty card body
- **AND** Identity leads with Chassis, Model, Year and Tech Level, followed by Clan Name and MUL ID

#### Scenario: Slots readiness counts placed slots

- **WHEN** mounted equipment has not been placed in critical slots
- **THEN** the Build readiness Slots row reads "<placed> of <total> slots filled · <n> pending." as a passing row (no warning icon), instead of counting the unplaced items as used slots, and reads "<placed> of <total> slots filled, <free> free." once every item is placed
- **AND** the Unplaced equipment row carries the warning for those items and names them with their slots ("PPC needs 3 slots; 1 item unplaced.", "PPC and Medium Laser need 5 slots; 2 items unplaced."), so Slots and Unplaced equipment never warn about the same item twice and the readiness list shows as many warning rows as the status button counts

#### Scenario: Overview reading order on phones

- **WHEN** the Overview tab renders on a narrow canvas
- **THEN** the cards stack as Identity, Build summary, then Component technology, so the unit's identity is visible on first view
- **AND** Identity is compact: Chassis and Model share a row, Year and Tech Level share a row, and Clan Name and MUL ID share the next row

#### Scenario: Tonnage change from Overview

- **WHEN** user changes tonnage in Overview tab
- **THEN** engine rating is recalculated to maintain Walk MP
- **AND** structure weight recalculates automatically
- **AND** all derived calculations update across tabs

#### Scenario: Tech base configuration

- **WHEN** user changes a subsystem tech base
- **THEN** the tech progression is updated
- **AND** Mixed tech is detected if subsystems use different tech bases
- **AND** component options are filtered to match the new tech base

### Requirement: Structure Tab

The Structure tab SHALL manage system components, enhancement selection, and movement configuration.

#### Scenario: Two-column layout

- **WHEN** Structure tab renders
- **THEN** left column shows Chassis panel with component selections
- **AND** right column stacks the Mobility panel and, below it, a separate Cooling panel, with all panels top-aligned (no stretched empty panel bodies)
- **AND** the Chassis panel shows Tonnage and, directly below it on the same row template, the Motive Type dropdown (Biped, Quad, Tripod, LAM, QuadVee) with its "Changing configuration clears armor in removed locations and returns their equipment to unassigned." warning attached through aria-describedby; the Mobility panel does not show Motive Type

#### Scenario: Chassis panel components

- **WHEN** Chassis panel renders
- **THEN** Engine Type dropdown is shown with weight and slots
- **AND** Gyro dropdown is shown with weight and slots
- **AND** Structure dropdown is shown with weight and slots
- **AND** Cockpit dropdown is shown with weight and slots
- **AND** Enhancement dropdown is shown (None, MASC, TSM)
- **AND** Engine Rating is displayed as derived info

#### Scenario: Walk MP drives engine rating

- **WHEN** user changes Walk MP value
- **THEN** engine rating is calculated as tonnage × walkMP
- **AND** engine rating is updated in the store

#### Scenario: Cooling is its own panel

- **WHEN** the Structure tab renders
- **THEN** the Cooling panel (Heat sink type, Installed stepper, and the OmniMech base chassis control when applicable) is a separate card below Mobility in the right column, not part of the Chassis panel
- **AND** the heat sink summary (heat sinks in the engine, external heat sinks, total dissipation) is shown as a right-aligned stat in the Cooling panel header
- **AND** it is not repeated as a separate row below the Installed stepper

#### Scenario: Weight strip labels its subtotal

- **WHEN** the Structure summary strip renders
- **THEN** it lists engine, gyro, structure, cockpit, heat sink, jump jet (when present) and armor weight
- **AND** the subtotal is labelled "Structure, systems & armor" and shown as "<subtotal>t of <tonnage>t"
- **AND** the label makes clear that equipment weight is counted in the header total, not in this subtotal

#### Scenario: Chassis, Mobility and Cooling share one label / control / meta grid

- **WHEN** the Chassis, Mobility or Cooling panel renders at least 32rem wide
- **THEN** every row uses one grid: a 140px label column, a control column that is 240px at minimum and at most 360px wide, and an 88px meta column that starts about 12px after the control column (so meta stays directly after its control when the card is wider than the grid)
- **AND** every control fills the control column, so all controls share one right edge: steppers (Tonnage, Installed heat sinks, Walk MP, Jump MP) keep 44px buttons and stretch their value box, and every select (Motive Type, Engine, Gyro, Structure, Cockpit, Heat sink type, Jump Type, Enhancement) is as wide as the stepper, never over 360px
- **AND** per-component cost meta (weight and critical slots, e.g. "19t · 6 slots", with tabular numerals, never wrapping) is right-aligned inside the 88px meta column directly after its control, while "→ <final> final" for Walk, Run and Jump MP starts at the left of the same column beside the control
- **AND** range hints such as the tonnage range ("Range 20–200t.") are 13px muted helper text under their control, linked with aria-describedby
- **AND** in a narrower card the grid is a single column (label, control, meta, helper text) and helper text uses the full card width

#### Scenario: Mobility rows

- **WHEN** the Mobility panel renders
- **THEN** Run MP is a read-only field with the same outline, height, width and value text colour as a stepper (primary, not muted), and a small lock icon, with no buttons and no tab stop, and "→ <final> final" in the meta column like the Walk MP and Jump MP rows
- **AND** the Walk MP range, the Run MP line ("Follows Walk MP; it is not set directly.") and the Max Jump MP note appear as 13px muted helper text directly under their control, linked with aria-describedby, with rows spaced about 72px apart so the Mobility and Cooling cards together end above 900px at a 1440x900 viewport
- **AND** Enhancement is an ordinary row below Jump Type labelled "Enhancement" (no separate sub-section heading), and the Mobility and Cooling card subtitles sit on the same line as their titles
- **AND** Jump Type stays enabled but is muted, with the hint "No jump jets installed", while Jump MP is 0
- **AND** the Mobility panel shows no copy about unsupported mechanical jump boosters
### Requirement: Armor Tab

The Armor tab SHALL manage armor type selection and location-based armor allocation.

#### Scenario: Armor allocation

- **WHEN** user modifies armor points for a location
- **THEN** the allocation is validated against location maximum
- **AND** total allocated points are updated
- **AND** visual diagram reflects the new values

#### Scenario: Auto-allocate armor

- **WHEN** user clicks Auto-Allocate button
- **THEN** armor points are distributed optimally across all locations
- **AND** location maximums are respected

#### Scenario: Allocated total is explained in words

- **WHEN** the Armor summary strip shows "Allocated <n> / <max> max"
- **THEN** a plain-words line below it states the points bought by the current armor tonnage ("<points> pts from <tons> t")
- **AND** when the chassis can still hold more armor than is allocated, the line adds how many more points fit and the extra tonnage they need (e.g. "3 more need +0.5 t")
- **AND** when points are bought but unplaced, over the chassis max, or beyond the chassis max, the line names that count instead
- **AND** all numbers come from the existing armor point and tonnage calculations
- **AND** the "<points> pts from <tons> t" text appears only in the summary strip; the Armor inspector header shows just its title

#### Scenario: Inspector aligns with the diagram

- **WHEN** no armor location is selected on a wide layout
- **THEN** no hint card is shown above the Armor inspector, so the inspector card starts at the same top edge as the Armor Allocation card
- **AND** the one visible instruction lives in the diagram caption ("Front view · click a location to edit"), and the keyboard instruction (Tab to a location, then press Enter) remains available to assistive technology
- **AND** when a location is selected the location editor opens inside the Armor inspector card, directly under its title, as an inset panel with its own close button

#### Scenario: Diagram and inspector cards end together

- **WHEN** the Armor tab renders at xl or wider with no location selected
- **THEN** the Armor Allocation card and the Armor inspector card stretch to the same bottom edge; the inspector stacks its controls, the Unallocated Armor Points row (16px below the last control or its "All allocatable points assigned" note, with no spacer pushing it away) and the legend row in order, and any spare height falls under the legend rather than between rows
- **AND** the diagram column is no longer sticky; when the location editor is open the diagram card stretches to the taller inspector column

#### Scenario: Location editor does not push the inspector off screen

- **WHEN** a location is selected at xl or wider (for example 1440x900)
- **THEN** the location editor replaces the Armor Type, Armor Tonnage, Maximize and Auto Allocate controls (hidden until the editor closes), while the Unallocated Armor Points row, the legend and the "F = front · R = rear armor" key stay visible within the viewport
- **WHEN** a location is selected below xl
- **THEN** the editor appears under the inspector title with the type and tonnage controls stacked below it, all still reachable, and the editor scrolls into view on phones

#### Scenario: Location table selects locations

- **WHEN** the biped silhouette card is wide enough to show its location table (see armor-diagram)
- **THEN** clicking a table row selects that location, opening the location editor in the inspector, and clicking it again closes the editor, the same as clicking its plate

### Requirement: Equipment Tab

The Equipment tab SHALL provide a unified equipment browser for selecting, adding, and managing all equipment types including weapons, ammunition, electronics, and miscellaneous equipment.

#### Scenario: Unified equipment management

- **WHEN** user navigates to Equipment tab
- **THEN** a compact loadout sidebar shows all mounted equipment
- **AND** an equipment browser allows searching and filtering all equipment types
- **AND** a status bar displays weight, slots, and heat summary

#### Scenario: Add equipment to unit

- **WHEN** user clicks Add button on equipment item in browser
- **THEN** equipment is added to the mounted equipment list
- **AND** loadout sidebar updates immediately
- **AND** status bar reflects updated totals

#### Scenario: Equipment filtering

- **WHEN** user applies filters via category toggles or text search
- **THEN** equipment browser shows only matching items
- **AND** multiple category toggles can be active simultaneously

### Requirement: Criticals Tab

The Criticals tab SHALL manage critical slot allocation and equipment placement.

#### Scenario: Equipment placement

- **WHEN** user drags equipment to a critical slot
- **THEN** equipment is placed if slot is available
- **AND** multi-slot equipment occupies consecutive slots
- **AND** visual feedback indicates valid/invalid drop targets

#### Scenario: Equipment removal

- **WHEN** user double-clicks occupied equipment slot
- **THEN** equipment is removed and returned to unallocated pool
- **AND** system components cannot be removed

### Requirement: Fluff Tab

The Fluff tab SHALL let the user edit the unit's combat role, manufacturers and narrative text.

#### Scenario: Page layout

- **WHEN** the Fluff tab renders in an editor container at least 64rem wide
- **THEN** a two-column grid spans the workspace content edges: the left column holds the Unit History and Description card, capped near 75 characters of 16px text plus card padding, and the right column holds the Sections index, then the Battlefield Role card, then the Manufacturing card in the remaining width (never under 20rem)
- **AND** the right column has no internal scroll and no fade mask, and every card renders at its natural height so no content is clipped
- **AND** the whole right column is sticky under the tab bar when it fits the scroll area; when it is taller than the scroll area only the Sections card is sticky and the other cards scroll with the page, unless the Sections card alone would cover more than half the scroll area, in which case nothing is sticky so no card is hidden behind another
- **AND** where the right column is at least 24rem wide the Sections links flow in two columns of four so the pinned card stays short
- **AND** in a narrower container the cards form one left-aligned column in the order narrative, role, manufacturing, each capped at the same reading width

#### Scenario: Narrative text fields

- **WHEN** user navigates to Fluff tab
- **THEN** each narrative field (Overview, Capabilities, History, Deployment, Variants, Notable Units) is a full-width textarea of its column at 16px text on a 1.5 line height, at least 3 rows, stacked in that order
- **AND** the field labels use the small-caps section-label style used for sub-section headings elsewhere in the customizer
- **AND** every textarea grows to show its full text, with no fixed-height box, no fade and no collapse control, so what is shown is what is edited
- **AND** an empty optional field shows a muted "Optional" tag, at least 14px, next to its label

#### Scenario: Section navigation

- **WHEN** the Fluff tab renders in a container at least 64rem wide
- **THEN** a compact Sections index is the first card of the right column, listing Overview, Capabilities, History, Deployment, Variants, Notable Units, Battlefield Role and Manufacturing in that order
- **AND** each link shows a muted word count or "Empty" based on the current field text
- **AND** in narrower containers a labelled "Jump to section" select appears at the top of the tab with the same destinations and text status
- **AND** activating a destination scrolls its field into view and focuses it, or focuses its containing section when the field is disabled
- **AND** the index does not change stored narrative, role or manufacturing values

#### Scenario: Battlefield role

- **WHEN** the Fluff tab renders an editable unit
- **THEN** the Battlefield Role card is compact: title, subtitle, then the Combat Role select at the full width of the card

#### Scenario: Manufacturing list

- **WHEN** the Manufacturing card renders
- **THEN** Manufacturer, Primary Factory and each system manufacturer are single-column "name | value" rows, so no field sits alone in a row
- **AND** a normal secondary "Add system" action, with its reason text visible, is the last row of an editable list
#### Scenario: Placeholders read as examples

- **WHEN** a Fluff field that is empty shows placeholder text
- **THEN** the placeholder begins with "e.g." and is drawn in muted italic placeholder styling, so it cannot be mistaken for a saved value

#### Scenario: Removing a system manufacturer

- **WHEN** an editable unit lists system manufacturers
- **THEN** each system row has an icon-only remove button with an accessible name, 44px square, inside the trailing edge of the row's input
- **AND** on fine hover pointers the button is invisible until the row is hovered or has focus within, and on coarse pointers it is always visible

### Requirement: Preview Tab

The Preview tab SHALL display a live record sheet preview with export options for
every customizer-editable unit type — BattleMech, Vehicle / VTOL / Support Vehicle,
Aerospace / Conventional Fighter, Battle Armor, Infantry, and ProtoMech.

The Preview tab SHALL be implemented as a unit-type dispatcher
(`PreviewTabForType`) that switches on the active `UnitType` and renders the
correct per-type preview component. The BattleMech branch SHALL render the
existing mech Preview implementation with no behaviour change.

**Rationale**: Users need to see and export their record sheet before printing for
tabletop play, regardless of unit type. The shared mech Preview component is coupled
to the mech store and crashes when mounted in a non-mech customizer.

**Priority**: High

#### Scenario: Preview tab display

- **WHEN** user navigates to Preview tab
- **THEN** a toolbar with Download PDF and Print buttons is displayed
- **AND** a record sheet preview canvas is displayed below
- **AND** preview shows current unit configuration

#### Scenario: Preview tab opens without crashing for non-mech types

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** user navigates to the Preview tab
- **THEN** the Preview tab SHALL render its per-type preview component
- **AND** it SHALL NOT throw "useUnitStore must be used within a UnitStoreProvider"

#### Scenario: Mech Preview behaviour preserved

- **GIVEN** the BattleMech customizer
- **WHEN** user navigates to the Preview tab
- **THEN** the Preview tab SHALL render the existing mech preview unchanged
- **AND** all pre-existing mech Preview tests SHALL continue to pass

#### Scenario: Preview updates on unit change

- **GIVEN** user is viewing Preview tab
- **WHEN** user switches to another tab and modifies the unit
- **AND** user returns to Preview tab
- **THEN** preview reflects the updated configuration

#### Scenario: Download PDF action

- **WHEN** user clicks Download PDF button in Preview tab
- **THEN** a PDF file is generated and downloaded for the unit's type
- **AND** filename follows pattern "{chassis}-{model}.pdf"

#### Scenario: Print action

- **WHEN** user clicks Print button in Preview tab
- **THEN** browser print dialog opens
- **AND** print content matches preview display

### Requirement: Overview Tab Non-Mech Crash Guard

The Overview tab SHALL render a working unit-identity editor for every non-mech
unit type, and SHALL NOT crash when rendered for a non-mech unit type. The
Overview tab SHALL be dispatched by unit type (`OverviewTabForType`): the
BattleMech branch renders the existing mech Overview implementation unchanged;
each non-mech branch renders that family's per-type Overview editor.

Every non-mech per-type Overview editor SHALL read and write its own per-type
store (Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech) and SHALL be
mounted only inside that store's context. The non-mech editors SHALL share one
store-free presentational panel (`NonMechIdentityPanel`) that edits the
unit-identity fields common to every non-mech store: chassis, model, MUL ID,
year, and rules level. Tech base SHALL be displayed read-only. A tonnage field
SHALL be shown only for unit types that carry tonnage (Vehicle / Aerospace /
ProtoMech) and SHALL be omitted for Battle Armor and Infantry.

**Rationale**: The shared mech `OverviewTab` hard-calls `useUnitStore` and
crashes when mounted in a non-mech customizer. The non-mech Overview tab
previously rendered a non-crashing placeholder; it now renders a real per-type
identity editor while remaining crash-safe.

**Priority**: Medium

#### Scenario: Non-mech Overview renders a per-type identity editor

- **GIVEN** a Vehicle / Aerospace / Battle Armor / Infantry / ProtoMech customizer
- **WHEN** user navigates to the Overview tab
- **THEN** the Overview tab SHALL render that unit type's identity editor with
  editable chassis, model, MUL ID, year, and rules-level fields
- **AND** it SHALL NOT throw "useUnitStore must be used within a
  UnitStoreProvider"

#### Scenario: Identity edits write through the per-type store

- **GIVEN** a non-mech customizer with its Overview tab open
- **WHEN** user edits the chassis or model field
- **THEN** the change SHALL be written to that unit type's store
- **AND** the store's `name` field SHALL stay in sync with `chassis` + `model`

#### Scenario: Tonnage field visibility by unit type

- **GIVEN** a non-mech customizer with its Overview tab open
- **WHEN** the unit type carries tonnage (Vehicle / Aerospace / ProtoMech)
- **THEN** an editable tonnage field SHALL be displayed
- **AND** WHEN the unit type does not (Battle Armor / Infantry) the tonnage
  field SHALL be omitted

#### Scenario: Mech Overview behaviour preserved

- **GIVEN** the BattleMech customizer
- **WHEN** user navigates to the Overview tab
- **THEN** the existing mech Overview editor SHALL render unchanged

### Requirement: OmniMech Checkbox Control

The Structure Tab SHALL provide a checkbox to toggle OmniMech status.

#### Scenario: OmniMech checkbox toggles isOmni state

- **Given** the Structure Tab is displayed
- **When** the user clicks the "OmniMech" checkbox
- **Then** the unit's `isOmni` state is toggled

#### Scenario: Enabling OmniMech shows additional controls

- **Given** the Structure Tab with OmniMech checkbox unchecked
- **When** the user checks the "OmniMech" checkbox
- **Then** the "Base Chassis Heat Sinks" spinner becomes visible
- **And** the "Reset Chassis" button becomes visible

#### Scenario: Disabling OmniMech hides additional controls

- **Given** the Structure Tab with OmniMech checkbox checked
- **When** the user unchecks the "OmniMech" checkbox
- **Then** the "Base Chassis Heat Sinks" spinner is hidden
- **And** the "Reset Chassis" button is hidden

---

### Requirement: Base Chassis Heat Sinks Control

The Structure Tab SHALL provide a spinner to set base chassis heat sinks for OmniMechs.

#### Scenario: Spinner visible only for OmniMechs

- **Given** a standard BattleMech (isOmni: false)
- **When** the Structure Tab is displayed
- **Then** the "Base Chassis Heat Sinks" spinner is NOT visible

#### Scenario: Spinner respects engine capacity maximum

- **Given** an OmniMech with engine capacity of 10 free heat sinks
- **When** the Structure Tab is displayed
- **Then** the spinner maximum value is 10

#### Scenario: Spinner updates baseChassisHeatSinks

- **Given** an OmniMech displayed in the Structure Tab
- **When** the user changes the spinner value to 8
- **Then** the unit's `baseChassisHeatSinks` is set to 8

---

### Requirement: Reset Chassis Button

The Structure Tab SHALL provide a button to reset the OmniMech chassis.

#### Scenario: Button visible only for OmniMechs

- **Given** a standard BattleMech (isOmni: false)
- **When** the Structure Tab is displayed
- **Then** the "Reset Chassis" button is NOT visible

#### Scenario: Button triggers reset chassis action

- **Given** an OmniMech displayed in the Structure Tab
- **When** the user clicks "Reset Chassis"
- **Then** a confirmation dialog is shown

#### Scenario: Confirming reset removes pod equipment

- **Given** an OmniMech with pod-mounted equipment
- **And** the user clicked "Reset Chassis"
- **When** the user confirms the dialog
- **Then** all pod-mounted equipment is removed
- **And** fixed equipment remains

#### Scenario: Canceling reset preserves equipment

- **Given** an OmniMech with pod-mounted equipment
- **And** the user clicked "Reset Chassis"
- **When** the user cancels the dialog
- **Then** all equipment (fixed and pod) remains unchanged

### Requirement: Armor Diagram Mode Selection

The customizer settings store SHALL manage armor diagram display mode with two options: schematic and silhouette.

**Source**: `src/stores/useCustomizerSettingsStore.ts:14-14`

**Rationale**: Users need to choose between technical schematic diagrams and visual silhouette representations based on their preference and use case.

#### Scenario: Change diagram mode directly

- **GIVEN** customizer settings store is initialized
- **WHEN** user calls `setArmorDiagramMode('schematic')`
- **THEN** `armorDiagramMode` is set to 'schematic'
- **AND** the change is persisted to localStorage immediately
- **AND** `hasUnsavedCustomizer` remains false

#### Scenario: Change diagram mode via draft

- **GIVEN** draft customizer is initialized with mode 'silhouette'
- **WHEN** user calls `setDraftArmorDiagramMode('schematic')`
- **THEN** `draftCustomizer.armorDiagramMode` is set to 'schematic'
- **AND** `hasUnsavedCustomizer` is set to true
- **AND** persisted `armorDiagramMode` remains unchanged

---

### Requirement: Armor Diagram Variant Selection

The customizer settings store SHALL manage four selectable armor diagram
styles, using stable IDs with the current display labels: `clean-tech`
(Standard), `neon-operator` (Glow), `tactical-hud` (HUD), and
`premium-material` (Chromatic). The persisted `megamek` value is retained only
for legacy migration and SHALL resolve to `clean-tech` before rendering; it is
not a selectable style.

**Source**: `src/stores/useCustomizerSettingsStore.ts:19-24`

**Rationale**: Users need to select visual themes for armor diagrams to match their aesthetic preferences and readability needs.

#### Scenario: Change variant directly

- **GIVEN** customizer settings store is initialized
- **WHEN** user calls `setArmorDiagramVariant('neon-operator')`
- **THEN** `armorDiagramVariant` is set to 'neon-operator'
- **AND** the change is persisted to localStorage immediately
- **AND** `hasUnsavedCustomizer` remains false

#### Scenario: Change variant via draft

- **GIVEN** draft customizer is initialized with variant 'clean-tech'
- **WHEN** user calls `setDraftArmorDiagramVariant('tactical-hud')`
- **THEN** `draftCustomizer.armorDiagramVariant` is set to 'tactical-hud'
- **AND** `hasUnsavedCustomizer` is set to true
- **AND** persisted `armorDiagramVariant` remains unchanged

---

### Requirement: Draft Preview Workflow

The customizer settings store SHALL support a draft/preview/apply workflow for live preview of settings changes without immediate persistence.

**Source**: `src/stores/useCustomizerSettingsStore.ts:44-57`

**Rationale**: Users need to preview customizer changes (especially visual variants) before committing them, with the ability to revert if unsatisfied.

#### Scenario: Initialize draft customizer

- **GIVEN** customizer settings with mode 'silhouette' and variant 'clean-tech'
- **WHEN** user calls `initDraftCustomizer()`
- **THEN** `draftCustomizer` is set to `{ armorDiagramMode: 'silhouette', armorDiagramVariant: 'clean-tech' }`
- **AND** `hasUnsavedCustomizer` is set to false

#### Scenario: Preview draft changes

- **GIVEN** draft customizer initialized with mode 'silhouette' and variant 'clean-tech'
- **WHEN** user calls `setDraftArmorDiagramVariant('neon-operator')`
- **THEN** `getEffectiveArmorDiagramVariant()` returns 'neon-operator'
- **AND** persisted `armorDiagramVariant` remains 'clean-tech'
- **AND** `hasUnsavedCustomizer` is true

#### Scenario: Apply draft changes

- **GIVEN** draft customizer with mode 'schematic' and variant 'tactical-hud'
- **AND** persisted settings are mode 'silhouette' and variant 'clean-tech'
- **WHEN** user calls `saveCustomizer()`
- **THEN** `armorDiagramMode` is set to 'schematic'
- **AND** `armorDiagramVariant` is set to 'tactical-hud'
- **AND** changes are persisted to localStorage
- **AND** `hasUnsavedCustomizer` is set to false

#### Scenario: Revert draft changes

- **GIVEN** draft customizer with mode 'schematic' and variant 'tactical-hud'
- **AND** persisted settings are mode 'silhouette' and variant 'clean-tech'
- **WHEN** user calls `revertCustomizer()`
- **THEN** `draftCustomizer` is set to null
- **AND** `hasUnsavedCustomizer` is set to false
- **AND** `getEffectiveArmorDiagramMode()` returns 'silhouette'
- **AND** `getEffectiveArmorDiagramVariant()` returns 'clean-tech'

---

### Requirement: Effective Settings Getters

The customizer settings store SHALL provide getter functions that return the effective settings (draft if exists, otherwise persisted).

**Source**: `src/stores/useCustomizerSettingsStore.ts:60-61`

**Rationale**: UI components need a single source of truth for current settings that automatically reflects draft changes during preview.

#### Scenario: Get effective mode without draft

- **GIVEN** no draft customizer exists
- **AND** persisted `armorDiagramMode` is 'silhouette'
- **WHEN** user calls `getEffectiveArmorDiagramMode()`
- **THEN** 'silhouette' is returned

#### Scenario: Get effective mode with draft

- **GIVEN** draft customizer with `armorDiagramMode` 'schematic'
- **AND** persisted `armorDiagramMode` is 'silhouette'
- **WHEN** user calls `getEffectiveArmorDiagramMode()`
- **THEN** 'schematic' is returned

#### Scenario: Get effective variant without draft

- **GIVEN** no draft customizer exists
- **AND** persisted `armorDiagramVariant` is 'clean-tech'
- **WHEN** user calls `getEffectiveArmorDiagramVariant()`
- **THEN** 'clean-tech' is returned

#### Scenario: Get effective variant with draft

- **GIVEN** draft customizer with `armorDiagramVariant` 'neon-operator'
- **AND** persisted `armorDiagramVariant` is 'clean-tech'
- **WHEN** user calls `getEffectiveArmorDiagramVariant()`
- **THEN** 'neon-operator' is returned

---

### Requirement: Persistence via Zustand Middleware

The customizer settings store SHALL persist settings to localStorage using Zustand persist middleware, excluding draft state.

**Source**: `src/stores/useCustomizerSettingsStore.ts:175-183`

**Rationale**: Settings must survive page refreshes, but draft state is intentionally ephemeral to prevent accidental persistence of unconfirmed changes.

#### Scenario: Persisted state excludes draft

- **GIVEN** customizer settings store with draft customizer
- **WHEN** Zustand persist middleware serializes state
- **THEN** `armorDiagramMode`, `armorDiagramVariant`, and `showArmorDiagramSelector` are persisted
- **AND** `draftCustomizer` and `hasUnsavedCustomizer` are NOT persisted

#### Scenario: Restore persisted settings on load

- **GIVEN** localStorage contains `{ armorDiagramMode: 'schematic', armorDiagramVariant: 'tactical-hud' }`
- **WHEN** customizer settings store is initialized
- **THEN** `armorDiagramMode` is 'schematic'
- **AND** `armorDiagramVariant` is 'tactical-hud'
- **AND** `draftCustomizer` is null
- **AND** `hasUnsavedCustomizer` is false

---

### Requirement: Reset to Defaults

The customizer settings store SHALL provide a reset function to restore default settings.

**Source**: `src/stores/useCustomizerSettingsStore.ts:64-64`

**Rationale**: Users need a way to return to known-good default settings if they become confused or want to start fresh.

#### Scenario: Reset to defaults

- **GIVEN** customizer settings with mode 'schematic' and variant 'neon-operator'
- **AND** draft customizer exists
- **WHEN** user calls `resetToDefaults()`
- **THEN** `armorDiagramMode` is set to 'silhouette' (default)
- **AND** `armorDiagramVariant` is set to 'clean-tech' (default)
- **AND** `showArmorDiagramSelector` is set to true (default)
- **AND** `draftCustomizer` is set to null
- **AND** `hasUnsavedCustomizer` is set to false

## Customizer Settings Store

---

## Data Model Requirements

### ArmorDiagramMode

```typescript
/**
 * Armor diagram display mode
 */
export type ArmorDiagramMode = 'schematic' | 'silhouette';
```

**Values**:

- `'schematic'`: Technical line-art diagram showing armor locations
- `'silhouette'`: Visual silhouette representation of the BattleMech

**Source**: `src/stores/useCustomizerSettingsStore.ts:14-14`

---

### ArmorDiagramVariant

```typescript
/**
 * Armor diagram design variants
 */
export type ArmorDiagramVariant =
  | 'clean-tech'
  | 'neon-operator'
  | 'tactical-hud'
  | 'premium-material'
  | 'megamek'; // legacy persisted value; never selectable
```

**Values**:

- `'clean-tech'`: Standard display label; minimalist design with clean lines (default)
- `'neon-operator'`: Glow display label; high-contrast neon aesthetic
- `'tactical-hud'`: HUD display label; military HUD-inspired design
- `'premium-material'`: Chromatic display label; material-inspired variant
- `'megamek'`: Legacy persisted value only; resolves to `clean-tech` and is not selectable

**Source**: `src/stores/useCustomizerSettingsStore.ts:19-24`

---

### CustomizerSettings

```typescript
/**
 * Customizer settings that support live preview with save/revert
 */
export interface CustomizerSettings {
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
}
```

**Purpose**: Represents the subset of customizer settings that support draft/preview workflow.

**Source**: `src/stores/useCustomizerSettingsStore.ts:29-32`

---

### CustomizerSettingsState

```typescript
/**
 * Customizer settings store state
 */
export interface CustomizerSettingsState {
  // Customizer preferences (persisted)
  armorDiagramMode: ArmorDiagramMode;
  armorDiagramVariant: ArmorDiagramVariant;
  showArmorDiagramSelector: boolean; // UAT feature flag

  // Draft customizer for live preview (not persisted)
  draftCustomizer: CustomizerSettings | null;
  hasUnsavedCustomizer: boolean;

  // Direct setters (immediately persisted)
  setArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  setShowArmorDiagramSelector: (show: boolean) => void;

  // Draft customizer actions for live preview (requires explicit save)
  setDraftArmorDiagramMode: (mode: ArmorDiagramMode) => void;
  setDraftArmorDiagramVariant: (variant: ArmorDiagramVariant) => void;
  saveCustomizer: () => void;
  revertCustomizer: () => void;
  initDraftCustomizer: () => void;

  // Getters for effective (draft or saved) customizer
  getEffectiveArmorDiagramMode: () => ArmorDiagramMode;
  getEffectiveArmorDiagramVariant: () => ArmorDiagramVariant;

  // Reset
  resetToDefaults: () => void;
}
```

**Purpose**: Complete Zustand store state including persisted settings, draft state, and actions.

**Source**: `src/stores/useCustomizerSettingsStore.ts:37-65`

---

### DEFAULT_CUSTOMIZER_SETTINGS

```typescript
const DEFAULT_CUSTOMIZER_SETTINGS: Omit<CustomizerSettingsState, ActionKeys> = {
  armorDiagramMode: 'silhouette',
  armorDiagramVariant: 'clean-tech',
  showArmorDiagramSelector: true, // Enable UAT selector by default
  draftCustomizer: null,
  hasUnsavedCustomizer: false,
};
```

**Purpose**: Default values for customizer settings on first load.

**Source**: `src/stores/useCustomizerSettingsStore.ts:81-87`

---

## Non-Goals

The following are explicitly **out of scope** for this specification:

1. **Armor Diagram Rendering**: Visual rendering of armor diagrams is handled by separate diagram components
2. **Armor Allocation Logic**: Armor point allocation and validation is handled by armor tab components
3. **Theme System Integration**: Global application theming is handled by the theming system
4. **User Preferences Sync**: Cross-device settings synchronization is handled by vault-sync
5. **Feature Flag Management**: Application-wide feature flags are handled by app settings store
6. **Undo/Redo**: Settings change history is not tracked
7. **Settings Migration**: Version migration for settings schema changes is not specified

