# customizer-tabs Specification

## Purpose

TBD - created by archiving change add-customizer-ui-components. Update Purpose after archive.

## Requirements

### Requirement: Tab Navigation

The customizer SHALL provide a tabbed navigation interface with seven tabs: Overview, Structure, Armor, Equipment, Criticals, Fluff, and Preview.

#### Scenario: User navigates between tabs

- **WHEN** user clicks on a tab label
- **THEN** the corresponding tab content is displayed
- **AND** the active tab is visually highlighted
- **AND** other tab contents are hidden

#### Scenario: Tab state persistence

- **WHEN** user selects a tab and refreshes the page
- **THEN** the previously selected tab is restored from localStorage

---

### Requirement: Tab Component Props

Each tab component SHALL accept a readOnly prop to disable editing capabilities.

#### Scenario: Read-only mode

- **WHEN** readOnly is true
- **THEN** all inputs, dropdowns, and buttons are disabled
- **AND** the user cannot modify any values

### Requirement: Unit Provider Integration

All tab components SHALL access unit state through the useUnit hook from MultiUnitProvider.

#### Scenario: Unit configuration access

- **WHEN** a tab component renders
- **THEN** it receives the current unit configuration via useUnit
- **AND** configuration changes are applied via updateConfiguration

### Requirement: Overview Tab

The Overview tab SHALL manage unit identity, basic configuration, tech progression, and provide a summary view.

#### Scenario: Basic Info section

- **WHEN** Overview tab renders
- **THEN** Basic Info section appears at the top
- **AND** Name input field allows editing the unit name
- **AND** Tonnage spinner allows setting tonnage (20-100, step 5)
- **AND** Motive Type dropdown shows Biped, Quad, Tripod, LAM, QuadVee options

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
- **AND** right column shows Movement panel
- **AND** tonnage and motive type are NOT shown (moved to Overview)

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

The Fluff tab SHALL display unit background and description information.

#### Scenario: Placeholder display

- **WHEN** user navigates to Fluff tab
- **THEN** a Coming Soon message is displayed
- **AND** feature preview cards show planned functionality

### Requirement: Preview Tab

The Preview tab SHALL display a live record sheet preview with export options.

**Rationale**: Users need to see their record sheet before printing or exporting for tabletop play.

**Priority**: High

#### Scenario: Preview tab display

- **WHEN** user navigates to Preview tab
- **THEN** a toolbar with Download PDF and Print buttons is displayed
- **AND** a record sheet preview canvas is displayed below
- **AND** preview shows current unit configuration

#### Scenario: Preview updates on unit change

- **GIVEN** user is viewing Preview tab
- **WHEN** user switches to another tab and modifies unit
- **AND** user returns to Preview tab
- **THEN** preview reflects the updated configuration

#### Scenario: Download PDF action

- **WHEN** user clicks Download PDF button in Preview tab
- **THEN** a PDF file is generated and downloaded
- **AND** filename follows pattern "{chassis}-{model}.pdf"

#### Scenario: Print action

- **WHEN** user clicks Print button in Preview tab
- **THEN** browser print dialog opens
- **AND** print content matches preview display

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

---

## Customizer Settings Store

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

The customizer settings store SHALL manage armor diagram design variant with five options: clean-tech, neon-operator, tactical-hud, premium-material, and megamek.

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
  | 'megamek';
```

**Values**:
- `'clean-tech'`: Minimalist design with clean lines (default)
- `'neon-operator'`: High-contrast neon aesthetic
- `'tactical-hud'`: Military HUD-inspired design
- `'premium-material'`: Material Design-inspired variant
- `'megamek'`: Classic MegaMek visual style

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
