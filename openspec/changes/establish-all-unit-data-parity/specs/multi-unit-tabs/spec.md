## MODIFIED Requirements

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
- **THEN** the tab bar SHALL show: Overview, Structure, Armor, Main Gun, Equipment, Preview, Fluff
- **AND** it SHALL NOT show a Glider tab, because MegaMekLab 62bf193 `PMMainUI` has none and glider is the motive choice of `PMChassisView`, which the Structure tab's chassis selection provides

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
