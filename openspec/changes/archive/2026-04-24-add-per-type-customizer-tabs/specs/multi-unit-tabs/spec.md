# multi-unit-tabs (delta)

## ADDED Requirements

### Requirement: Canonical Per-Type Tab Sets

The customizer SHALL render a locked, canonical set of tabs for each supported unit type. Tab sets differ by type and are defined in a `TabSpec` registry keyed by `UnitType`.

**Rationale**: Without a locked tab set, each construction proposal will invent its own UI, producing inconsistent UX across types and making later changes (armor diagrams, record sheet) impossible to align.

**Priority**: Critical

#### Scenario: Mech unit shows mech tab set

- **GIVEN** a BattleMech loaded in the customizer
- **WHEN** the customizer renders
- **THEN** the tab bar SHALL show exactly: Overview, Structure, Armor, Equipment, Critical Slots, Preview, Fluff

#### Scenario: Vehicle unit shows vehicle tab set

- **GIVEN** a combat vehicle loaded in the customizer
- **WHEN** the customizer renders
- **THEN** the tab bar SHALL show exactly: Overview, Structure, Armor, Turret, Equipment, Preview, Fluff

#### Scenario: Aerospace unit shows aerospace tab set

- **GIVEN** an aerospace fighter loaded
- **WHEN** the customizer renders
- **THEN** the tab bar SHALL show: Overview, Structure, Armor, Equipment, Velocity, Bombs, Preview, Fluff

#### Scenario: BattleArmor unit shows BA tab set

- **GIVEN** a BattleArmor squad loaded
- **WHEN** the customizer renders
- **THEN** the tab bar SHALL show: Overview, Chassis, Squad, Manipulators, Modular Weapons, AP Weapons, Jump/UMU, Preview, Fluff

#### Scenario: Infantry unit shows infantry tab set

- **GIVEN** an infantry platoon loaded
- **WHEN** the customizer renders
- **THEN** the tab bar SHALL show: Overview, Platoon, Primary Weapon, Secondary Weapons, Field Guns, Specialization, Preview, Fluff

#### Scenario: ProtoMech unit shows ProtoMech tab set

- **GIVEN** a ProtoMech point loaded
- **WHEN** the customizer renders
- **THEN** the tab bar SHALL show: Overview, Structure, Armor, Main Gun, Equipment, Glider, Preview, Fluff

---

### Requirement: Conditional Tab Visibility

A `TabSpec` MAY declare a `visibleWhen` predicate. The customizer SHALL hide tabs whose predicate returns `false` for the current unit state.

**Priority**: High

#### Scenario: Conventional fighter hides Bombs tab

- **GIVEN** an aerospace unit with `chassisType: 'conventional-fighter'`
- **WHEN** the tab bar renders
- **THEN** the Bombs tab SHALL NOT appear

#### Scenario: Jump infantry hides Field Guns tab

- **GIVEN** an infantry platoon with `motiveType: 'Jump'`
- **WHEN** the tab bar renders
- **THEN** the Field Guns tab SHALL NOT appear

#### Scenario: Ultraheavy ProtoMech hides Glider tab

- **GIVEN** a ProtoMech in the Ultraheavy weight class (10–15t)
- **WHEN** the tab bar renders
- **THEN** the Glider tab SHALL NOT appear

---

### Requirement: Shared Tab Implementations

The Overview, Preview, and Fluff tabs SHALL be shared implementations usable across all unit types; their component modules live outside any per-type folder.

**Priority**: High

#### Scenario: Fluff data uniform across types

- **GIVEN** any unit type
- **WHEN** the Fluff tab renders
- **THEN** it SHALL present the same fluff fields (description, history, capabilities) regardless of unit type

---

### Requirement: Tab Dirty Tracking

The `useCustomizerTabs` hook SHALL track which tabs have pending (un-saved) field changes, expose this via a `dirtyTabs: Set<string>` selector, and display a visual marker on dirty tabs.

**Priority**: High

#### Scenario: Dirty marker appears on edit

- **GIVEN** a user editing the Armor tab
- **WHEN** any armor field is changed but not yet saved
- **THEN** the Armor tab label SHALL display a dirty marker (e.g., bullet or asterisk)

#### Scenario: Dirty marker clears on save

- **GIVEN** a dirty Armor tab
- **WHEN** the unit is saved
- **THEN** the dirty marker SHALL clear

---

### Requirement: Validation Error Markers

Tabs whose fields currently fail construction validation SHALL display an error marker distinguishable from the dirty marker.

**Priority**: Medium

#### Scenario: Error marker on validation failure

- **GIVEN** a vehicle where armor on Front location exceeds max
- **WHEN** the tab bar renders
- **THEN** the Armor tab label SHALL display a red dot or equivalent error indicator with an ARIA label naming the failing rule (`VAL-VEHICLE-ARMOR-MAX`)
