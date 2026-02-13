# infantry-unit-system Specification

## Purpose

Define construction rules, state management, BLK parsing/serialization, validation, and customizer UI for conventional Infantry platoon units. Infantry are squad-based personnel units organized into platoons of multiple squads, distinguished from Battle Armor by their use of field guns, primary/secondary weapon types, armor kits, and transport-dependent mechanized variants.

## Non-Goals

- Combat mechanics and damage calculations OUT OF SCOPE
- Battle Armor construction rules (covered by a separate specification)
- ProtoMech construction rules (covered by a separate specification)
- Equipment database / weapon catalog details
- Campaign-level infantry management

## Requirements

### Requirement: Infantry Unit Classification

The system SHALL classify Infantry as a squad-based personnel unit type with `unitType: UnitType.INFANTRY`.

#### Scenario: Infantry unit type identification

- **WHEN** creating or parsing an Infantry unit
- **THEN** `unitType` MUST be `UnitType.INFANTRY`
- **AND** the unit MUST extend `ISquadUnit` from the base unit hierarchy
- **AND** the unit SHALL belong to the `PERSONNEL` unit category

#### Scenario: Infantry type guard

- **WHEN** checking if a unit is Infantry
- **THEN** `isInfantry(unit)` SHALL return `true` when `unit.unitType === UnitType.INFANTRY`
- **AND** `isPersonnelUnit(unit)` SHALL also return `true`

### Requirement: Platoon Composition

Infantry units SHALL be organized as platoons composed of multiple squads.

#### Scenario: Default platoon configuration

- **WHEN** creating a new Infantry platoon with no options
- **THEN** `squadSize` SHALL default to `7` soldiers per squad
- **AND** `numberOfSquads` SHALL default to `4`
- **AND** `platoonStrength` SHALL equal `squadSize * numberOfSquads` (28 soldiers)

#### Scenario: Squad size constraints

- **WHEN** setting squad size
- **THEN** `squadSize` MUST be clamped to the range `[1, 10]`
- **AND** the store SHALL enforce `Math.max(1, Math.min(10, squadSize))`

#### Scenario: Number of squads constraints

- **WHEN** setting number of squads
- **THEN** `numberOfSquads` MUST be clamped to the range `[1, 10]`
- **AND** the store SHALL enforce `Math.max(1, Math.min(10, numberOfSquads))`

#### Scenario: Standard platoon count warning

- **WHEN** validating an Infantry unit with more than 4 squads
- **THEN** a warning SHALL be generated: "Unusual number of squads (standard is 2-4)"

### Requirement: Motion Types

Infantry units SHALL support multiple motion types determining movement capability.

#### Scenario: Supported motion types

- **WHEN** configuring Infantry motion type
- **THEN** the system SHALL support the following `SquadMotionType` values:
  - `FOOT` — standard foot infantry (default, ground MP 1)
  - `JUMP` — jump-capable infantry
  - `MOTORIZED` — motorized transport
  - `MECHANIZED` — mechanized (IFV-transported)
  - `WHEELED` — wheeled transport
  - `TRACKED` — tracked transport
  - `HOVER` — hover transport
  - `VTOL` — VTOL transport
  - `BEAST` — beast-mounted

#### Scenario: Default motion type

- **WHEN** creating a new Infantry platoon with no motion type specified
- **THEN** `motionType` SHALL default to `SquadMotionType.FOOT`
- **AND** `groundMP` SHALL default to `1`
- **AND** `jumpMP` SHALL default to `0`

#### Scenario: Movement point constraints

- **WHEN** setting movement points
- **THEN** `groundMP` MUST be `>= 0`
- **AND** `jumpMP` MUST be `>= 0`

### Requirement: Primary Weapon Types

Every Infantry platoon SHALL have a primary weapon type.

#### Scenario: Available primary weapon types

- **WHEN** configuring Infantry primary weapon
- **THEN** the system SHALL support the `InfantryPrimaryWeaponType` enum values:
  - `RIFLE`, `LASER`, `SRM`, `FLAMER`, `MACHINE_GUN`, `AUTO_RIFLE`, `NEEDLER`, `GYROJET`, `SUPPORT`, `ARCHAIC`

#### Scenario: Default primary weapon

- **WHEN** creating a new Infantry platoon with no primary weapon specified
- **THEN** `primaryWeapon` SHALL default to `'Rifle'`

#### Scenario: Primary weapon validation

- **WHEN** validating an Infantry unit with no primary weapon defined
- **THEN** a WARNING (not error) SHALL be generated: "Infantry unit has no primary weapon defined"
- **AND** rule `VAL-PERS-003` SHALL produce this warning

#### Scenario: Primary weapon with equipment ID

- **WHEN** setting a primary weapon
- **THEN** `primaryWeapon` SHALL store the weapon display name (string)
- **AND** `primaryWeaponId` MAY store the equipment database ID (optional string)

### Requirement: Secondary Weapons

Infantry platoons SHALL support optional secondary weapons in addition to the primary.

#### Scenario: Secondary weapon configuration

- **WHEN** configuring a secondary weapon
- **THEN** `secondaryWeapon` SHALL store the weapon name (string or undefined)
- **AND** `secondaryWeaponId` MAY store the equipment database ID
- **AND** `secondaryWeaponCount` SHALL specify the number of secondary weapons per squad

#### Scenario: Default secondary weapon state

- **WHEN** creating a new Infantry platoon
- **THEN** `secondaryWeapon` SHALL be `undefined`
- **AND** `secondaryWeaponCount` SHALL default to `0`

#### Scenario: Secondary weapon count constraint

- **WHEN** setting secondary weapon count
- **THEN** the value MUST be `>= 0`

### Requirement: Field Guns

The system SHALL support field guns as equipment unique to the Infantry unit type.

#### Scenario: Field gun data structure

- **WHEN** adding a field gun to an Infantry platoon
- **THEN** each field gun SHALL be represented as `IInfantryFieldGun`:
  - `equipmentId: string` — equipment ID of the field gun
  - `name: string` — display name
  - `crew: number` — number of crew required to operate

#### Scenario: Default field gun crew

- **WHEN** parsing field guns from BLK format
- **THEN** crew SHALL default to `2` per field gun

#### Scenario: Jump infantry field gun restriction

- **WHEN** validating an Infantry unit with `motionType === SquadMotionType.JUMP`
- **AND** the unit has one or more field guns
- **THEN** validation SHALL produce an error: "Jump infantry cannot carry field guns"

#### Scenario: Field gun crew size validation

- **WHEN** validating an Infantry unit with a field gun
- **AND** the field gun's `crew` exceeds the unit's `squadSize`
- **THEN** validation SHALL produce an error: "Field gun {name} requires more crew than squad size"

#### Scenario: Field gun store actions

- **WHEN** managing field guns in the Infantry store
- **THEN** `addFieldGun(gun)` SHALL append a gun to the `fieldGuns` array
- **AND** `removeFieldGun(equipmentId)` SHALL remove the gun matching the equipment ID
- **AND** `clearFieldGuns()` SHALL empty the `fieldGuns` array

### Requirement: Armor Kits

Infantry units SHALL support armor kit selection affecting damage divisor.

#### Scenario: Available armor kits

- **WHEN** selecting an armor kit
- **THEN** the system SHALL support the `InfantryArmorKit` enum values:
  - `NONE`, `STANDARD`, `FLAK`, `ABLATIVE`, `SNEAK_CAMO`, `SNEAK_IR`, `SNEAK_ECM`, `SNEAK_CAMO_IR`, `SNEAK_IR_ECM`, `SNEAK_COMPLETE`, `CLAN`, `ENVIRONMENTAL`

#### Scenario: Default armor kit

- **WHEN** creating a new Infantry platoon
- **THEN** `armorKit` SHALL default to `InfantryArmorKit.NONE`
- **AND** `damageDivisor` SHALL default to `1`

#### Scenario: Armor kit damage divisor mapping

- **WHEN** setting an armor kit
- **THEN** `damageDivisor` SHALL be automatically computed by `getArmorKitDivisor()`:
  - `NONE`, `STANDARD`, `FLAK` => `1`
  - `ABLATIVE` => `1.5`
  - `SNEAK_CAMO`, `SNEAK_IR`, `SNEAK_ECM`, `SNEAK_CAMO_IR`, `SNEAK_IR_ECM`, `SNEAK_COMPLETE` => `1`
  - `CLAN` => `2`
  - `ENVIRONMENTAL` => `1`

#### Scenario: Damage divisor floor

- **WHEN** setting `damageDivisor` directly
- **THEN** the value MUST be `>= 1`

### Requirement: Specializations

The system SHALL support specialization types for Infantry platoons.

#### Scenario: Available specializations

- **WHEN** configuring Infantry specialization
- **THEN** the system SHALL support the `InfantrySpecialization` enum values:
  - `NONE`, `ANTI_MECH`, `PARATROOPER`, `MOUNTAIN`, `MARINE`, `XCT`, `TAG`, `ENGINEER`

#### Scenario: Default specialization

- **WHEN** creating a new Infantry platoon
- **THEN** `specialization` SHALL default to `InfantrySpecialization.NONE`

### Requirement: Anti-Mech Training

The system SHALL support anti-mech training that MUST enable swarm and leg attacks.

#### Scenario: Anti-mech capability flags

- **WHEN** an Infantry unit has `hasAntiMechTraining === true`
- **THEN** `canSwarm` SHALL be `true`
- **AND** `canLegAttack` SHALL be `true`

#### Scenario: Default anti-mech state

- **WHEN** creating a new Infantry platoon
- **THEN** `hasAntiMechTraining` SHALL be `false`
- **AND** `canSwarm` SHALL be `false`
- **AND** `canLegAttack` SHALL be `false`

#### Scenario: Anti-mech training validation

- **WHEN** validating an Infantry unit where `canSwarm` is `true`
- **AND** `hasAntiMechTraining` is `false`
- **THEN** validation SHALL produce an error: "Swarm attacks require anti-mech training"

### Requirement: Augmentation

The system SHALL support cybernetic augmentation for Infantry platoons.

#### Scenario: Augmentation configuration

- **WHEN** setting augmentation
- **THEN** `isAugmented` SHALL be set to the boolean value
- **AND** if `isAugmented === true`, `augmentationType` MAY specify the type (e.g., `'DEST'`)
- **AND** if `isAugmented === false`, `augmentationType` SHALL be cleared to `undefined`

#### Scenario: Default augmentation state

- **WHEN** creating a new Infantry platoon
- **THEN** `isAugmented` SHALL be `false`
- **AND** `augmentationType` SHALL be `undefined`

### Requirement: Infantry State Shape

The Infantry state SHALL be defined by `InfantryState` and managed via Zustand stores.

#### Scenario: Complete state interface

- **WHEN** defining the Infantry store state
- **THEN** `InfantryState` SHALL include:
  - **Identity**: `id` (readonly string), `name`, `chassis`, `model`, `mulId`, `year`, `rulesLevel`
  - **Classification**: `techBase` (Inner Sphere or Clan), `unitType` (always `UnitType.INFANTRY`)
  - **Platoon Configuration**: `squadSize`, `numberOfSquads`, `motionType`, `groundMP`, `jumpMP`
  - **Weapons**: `primaryWeapon`, `primaryWeaponId?`, `secondaryWeapon?`, `secondaryWeaponId?`, `secondaryWeaponCount`
  - **Protection**: `armorKit`, `damageDivisor`
  - **Specialization**: `specialization`, `hasAntiMechTraining`, `isAugmented`, `augmentationType?`
  - **Field Guns**: `fieldGuns: IInfantryFieldGun[]`
  - **Metadata**: `isModified`, `createdAt`, `lastModifiedAt`

#### Scenario: Store persistence

- **WHEN** persisting Infantry state to localStorage
- **THEN** the storage key SHALL be `megamek-infantry-{id}`
- **AND** all state fields SHALL be partitioned for persistence (full state)
- **AND** `skipHydration` SHALL be `true` (manual hydration via registry)

#### Scenario: Store context and hooks

- **WHEN** accessing the Infantry store in React components
- **THEN** `InfantryStoreContext` SHALL provide the store via React Context
- **AND** `useInfantryStore(selector)` SHALL select state from context
- **AND** `useInfantryStoreApi()` SHALL return the raw store API
- **AND** both hooks SHALL throw if used outside `InfantryStoreContext.Provider`

### Requirement: IInfantry Interface

The parsed Infantry unit SHALL conform to the `IInfantry` interface extending `ISquadUnit`.

#### Scenario: IInfantry extends ISquadUnit

- **WHEN** defining the parsed Infantry data model
- **THEN** `IInfantry` SHALL extend `ISquadUnit` (which extends `IBaseUnit`)
- **AND** SHALL include Infantry-specific fields:
  - `numberOfSquads: number` — squads in platoon
  - `platoonStrength: number` — total soldiers (`squadSize * numberOfSquads`)
  - `primaryWeapon: string`, `primaryWeaponId?: string`
  - `secondaryWeapon?: string`, `secondaryWeaponId?: string`, `secondaryWeaponCount: number`
  - `armorKit: InfantryArmorKit`
  - `specialization: InfantrySpecialization`
  - `fieldGuns: readonly IInfantryFieldGun[]`
  - `hasAntiMechTraining: boolean`, `isAugmented: boolean`, `augmentationType?: string`
  - `canSwarm: boolean`, `canLegAttack: boolean`

### Requirement: BLK Format Parsing

The system SHALL parse Infantry units from BLK document format.

#### Scenario: Basic BLK field mapping

- **WHEN** parsing an Infantry BLK document
- **THEN** `squadSize` SHALL map from `document.squadSize` (default `7`)
- **AND** `numberOfSquads` SHALL map from `document.squadn` (default `4`)
- **AND** `primaryWeapon` SHALL map from `document.primary` (default `'Rifle'`)
- **AND** `secondaryWeapon` SHALL map from `document.secondary`
- **AND** `secondaryWeaponCount` SHALL map from `document.secondn` (default `0`)
- **AND** `platoonStrength` SHALL be calculated as `squadSize * numberOfSquads`

#### Scenario: Motion type mapping from BLK

- **WHEN** parsing motion type from BLK `document.motionType`
- **THEN** the string SHALL be case-insensitively mapped:
  - `'foot'` or `'leg'` => `SquadMotionType.FOOT`
  - `'jump'` => `SquadMotionType.JUMP`
  - `'motorized'` => `SquadMotionType.MOTORIZED`
  - `'mechanized'` => `SquadMotionType.MECHANIZED`
  - `'wheeled'` => `SquadMotionType.WHEELED`
  - `'tracked'` => `SquadMotionType.TRACKED`
  - `'hover'` => `SquadMotionType.HOVER`
  - `'vtol'` => `SquadMotionType.VTOL`
  - `'beast'` => `SquadMotionType.BEAST`
- **AND** unknown values SHALL default to `SquadMotionType.FOOT`

#### Scenario: Armor kit mapping from BLK

- **WHEN** parsing armor kit from BLK `document.armorKit`
- **THEN** the string SHALL be case-insensitively mapped:
  - `'none'` => `InfantryArmorKit.NONE`
  - `'standard'` => `InfantryArmorKit.STANDARD`
  - `'flak'` => `InfantryArmorKit.FLAK`
  - `'ablative'` => `InfantryArmorKit.ABLATIVE`
  - `'clan'` => `InfantryArmorKit.CLAN`
  - `'environmental'` => `InfantryArmorKit.ENVIRONMENTAL`
- **AND** unknown values SHALL default to `InfantryArmorKit.NONE`

#### Scenario: Movement parsing from BLK

- **WHEN** parsing movement from BLK
- **THEN** `groundMP` SHALL map from `document.cruiseMP` (default `1`)
- **AND** `jumpMP` SHALL map from `document.jumpingMP` (default `0`)
- **AND** `umuMP` SHALL be set to `0`

#### Scenario: Field gun parsing from BLK

- **WHEN** parsing field guns from BLK equipment
- **THEN** the handler SHALL scan `document.equipmentByLocation` entries
- **AND** any equipment name containing `'field gun'` (case-insensitive) SHALL be parsed as `IInfantryFieldGun`
- **AND** each field gun SHALL have `crew` default to `2`

#### Scenario: Specialization parsing from BLK raw tags

- **WHEN** parsing specialization from `document.rawTags.specialization`
- **THEN** the string SHALL be case-insensitively matched:
  - contains `'anti-mech'` or `'antimech'` => `ANTI_MECH`
  - contains `'para'` => `PARATROOPER`
  - contains `'mountain'` => `MOUNTAIN`
  - contains `'marine'` => `MARINE`
  - contains `'xct'` => `XCT`
  - contains `'tag'` => `TAG`
  - contains `'engineer'` => `ENGINEER`
- **AND** missing or unrecognized values SHALL default to `InfantrySpecialization.NONE`

#### Scenario: Anti-mech and augmentation flags from BLK

- **WHEN** parsing special flags from `document.rawTags`
- **THEN** `hasAntiMechTraining` SHALL be `true` if `rawTags.antimech` is `'true'` or `'1'`
- **AND** `isAugmented` SHALL be `true` if `rawTags.augmented` is `'true'` or `'1'`
- **AND** `augmentationType` SHALL map from `rawTags.augmentationtype`

#### Scenario: Tech base parsing from BLK

- **WHEN** parsing tech base from BLK `document.type` string
- **THEN** if the string contains `'clan'` (case-insensitive) and NOT `'mixed'`, tech base SHALL be `TechBase.CLAN`
- **AND** otherwise tech base SHALL default to `TechBase.INNER_SPHERE`

#### Scenario: Rules level parsing from BLK

- **WHEN** parsing rules level from BLK `document.type` string
- **THEN** `'level 1'` or `'introductory'` => `RulesLevel.INTRODUCTORY`
- **AND** `'level 2'` or `'standard'` => `RulesLevel.STANDARD`
- **AND** `'level 3'` or `'advanced'` => `RulesLevel.ADVANCED`
- **AND** default SHALL be `RulesLevel.INTRODUCTORY`

### Requirement: BLK Format Serialization

The system SHALL serialize Infantry units to the standard serialized format.

#### Scenario: Serialized Infantry fields

- **WHEN** serializing an Infantry unit
- **THEN** `configuration` SHALL be set to `unit.motionType`
- **AND** `rulesLevel` SHALL be set to `String(unit.rulesLevel)`
- **AND** common fields (chassis, model, unitType) SHALL be included

#### Scenario: Deserialization placeholder

- **WHEN** attempting to deserialize an Infantry unit from standard format
- **THEN** the handler SHALL return a failure result with message: "Infantry deserialization not yet implemented"

### Requirement: Infantry Validation Rules

The system SHALL validate Infantry units using both handler-specific and shared personnel rules.

#### Scenario: Squad size range validation (handler)

- **WHEN** validating squad size in `InfantryUnitHandler`
- **THEN** squad size outside range `[1, 10]` SHALL produce an error: "Infantry squad size must be between 1 and 10"

#### Scenario: Squad size positive integer validation (shared rule VAL-PERS-001)

- **WHEN** validating squad size via `PersonnelSquadSizeValid`
- **THEN** squad size MUST be a positive integer
- **AND** `undefined`, `0`, negative, or non-integer values SHALL produce error severity `ERROR`
- **AND** this rule applies to both Infantry and Battle Armor unit types

#### Scenario: Primary weapon required (shared rule VAL-PERS-003)

- **WHEN** validating via `InfantryPrimaryWeaponRequired`
- **THEN** missing primary weapon SHALL produce severity `WARNING` (not error)
- **AND** this rule applies only to `UnitType.INFANTRY`

### Requirement: Weight Calculation

The system SHALL calculate Infantry platoon weight.

#### Scenario: Weight from platoon strength

- **WHEN** calculating Infantry weight
- **THEN** base weight SHALL be `platoonStrength * 0.08` tons (80kg per soldier)
- **AND** each field gun SHALL add `0.5` tons
- **AND** total weight SHALL be the sum

#### Scenario: Weight calculation example

- **WHEN** a platoon has 28 soldiers and 0 field guns
- **THEN** weight SHALL be `28 * 0.08 = 2.24` tons

#### Scenario: Weight with field guns example

- **WHEN** a platoon has 16 soldiers and 2 field guns
- **THEN** weight SHALL be `16 * 0.08 + 2 * 0.5 = 2.28` tons

### Requirement: Battle Value Calculation

The system SHALL calculate Infantry battle value (BV).

#### Scenario: Base BV per soldier

- **WHEN** calculating Infantry BV
- **THEN** base BV per soldier SHALL be `2`

#### Scenario: Weapon BV modifiers

- **WHEN** primary weapon name contains `'laser'` (case-insensitive)
- **THEN** BV per soldier SHALL increase by `1`
- **WHEN** primary weapon name contains `'srm'` (case-insensitive)
- **THEN** BV per soldier SHALL increase by `2`

#### Scenario: Anti-mech training BV modifier

- **WHEN** `hasAntiMechTraining` is `true`
- **THEN** BV per soldier SHALL increase by `1`

#### Scenario: Armor BV modifier

- **WHEN** `armorKit` is not `NONE`
- **THEN** BV per soldier SHALL increase by `0.5`

#### Scenario: Total BV calculation

- **WHEN** calculating total BV
- **THEN** total BV SHALL be `Math.round(platoonStrength * bvPerSoldier)`

### Requirement: Cost Calculation

The system SHALL calculate Infantry platoon cost in C-Bills.

#### Scenario: Base cost per soldier

- **WHEN** calculating Infantry cost
- **THEN** base cost per soldier SHALL be `1,000` C-Bills

#### Scenario: Anti-mech training cost

- **WHEN** `hasAntiMechTraining` is `true`
- **THEN** cost per soldier SHALL increase by `500` C-Bills

#### Scenario: Armor cost modifiers

- **WHEN** `armorKit` is `InfantryArmorKit.CLAN`
- **THEN** cost per soldier SHALL increase by `2,000` C-Bills
- **WHEN** `armorKit` is any other non-NONE value
- **THEN** cost per soldier SHALL increase by `500` C-Bills

#### Scenario: Field gun cost

- **WHEN** the platoon has field guns
- **THEN** each field gun SHALL add `50,000` C-Bills to total cost

#### Scenario: Total cost calculation

- **WHEN** calculating total cost
- **THEN** total cost SHALL be `(platoonStrength * costPerSoldier) + (fieldGunCount * 50,000)`

### Requirement: Customizer UI

The Infantry customizer SHALL provide a simplified single-tab interface.

#### Scenario: Customizer component structure

- **WHEN** rendering the Infantry customizer
- **THEN** `InfantryCustomizer` SHALL wrap content in `InfantryStoreContext.Provider`
- **AND** SHALL display a header: "Infantry Platoon Configuration"
- **AND** SHALL render a single `InfantryBuildTab` component

#### Scenario: Build tab sections

- **WHEN** rendering the `InfantryBuildTab`
- **THEN** the tab SHALL display four sections:
  1. **Identity** — Unit Name (chassis), Variant (model), Tech Base (IS/Clan select)
  2. **Platoon Configuration** — Squad Size (1-10), Number of Squads (1-10), Platoon Strength (computed display), Motion Type (Foot/Motorized/Mechanized/Jump), Ground MP (0-5), Jump MP (0-5)
  3. **Weapons** — Primary Weapon (text input), Secondary Weapon (text input, placeholder "None"), Secondary Count (number input)
  4. **Protection & Specialization** — Armor Kit (select from all `InfantryArmorKit` values), Specialization (select from all `InfantrySpecialization` values), Anti-Mech Training (checkbox)

#### Scenario: Read-only mode

- **WHEN** `readOnly` prop is `true`
- **THEN** all inputs and selects SHALL be disabled
- **AND** no store actions SHALL be invoked on change events

#### Scenario: Computed platoon strength display

- **WHEN** squad size or number of squads changes
- **THEN** the Platoon Strength display SHALL update to `squadSize * numberOfSquads` with suffix " soldiers"

### Requirement: Handler Registration

The `InfantryUnitHandler` SHALL be registered in the unit type handler system.

#### Scenario: Handler identity

- **WHEN** creating an `InfantryUnitHandler`
- **THEN** `unitType` SHALL be `UnitType.INFANTRY`
- **AND** `displayName` SHALL be `'Infantry'`
- **AND** `getLocations()` SHALL return `['Platoon']`

#### Scenario: Handler can-handle check

- **WHEN** checking if the handler can handle a BLK document
- **THEN** it SHALL return `true` only when `document.mappedUnitType === UnitType.INFANTRY`

#### Scenario: Factory function

- **WHEN** calling `createInfantryHandler()`
- **THEN** a new `InfantryUnitHandler` instance SHALL be returned
- **AND** each call SHALL create an independent instance

### Requirement: Transport Requirements

The system SHALL classify Infantry platoons by transport dependency based on motion type.

#### Scenario: Transport-dependent motion types

- **WHEN** an Infantry platoon has `motionType` of `MECHANIZED`, `WHEELED`, `TRACKED`, `HOVER`, or `VTOL`
- **THEN** the platoon is classified as transport-dependent
- **AND** ground MP SHALL reflect the transport vehicle's movement capability

#### Scenario: Foot and jump infantry independence

- **WHEN** an Infantry platoon has `motionType` of `FOOT` or `JUMP`
- **THEN** the platoon is classified as independent (no transport required)

## Implementation Mapping

| Concept                                      | Source File                                                         |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `InfantryState` interface + defaults         | `src/stores/infantryState.ts`                                       |
| Zustand store factory + actions              | `src/stores/useInfantryStore.ts`                                    |
| `IInfantry` + `IInfantryFieldGun` interfaces | `src/types/unit/PersonnelInterfaces.ts`                             |
| `ISquadUnit` + `SquadMotionType` base types  | `src/types/unit/BaseUnitInterfaces.ts`                              |
| BLK parsing + validation + serialization     | `src/services/units/handlers/InfantryUnitHandler.ts`                |
| Shared personnel validation rules            | `src/services/validation/rules/personnel/PersonnelCategoryRules.ts` |
| Customizer UI                                | `src/components/customizer/infantry/InfantryCustomizer.tsx`         |
| Build tab UI                                 | `src/components/customizer/infantry/InfantryBuildTab.tsx`           |
| Unit store registry (shared)                 | `src/stores/unitStoreRegistry.ts`                                   |

## Dependencies

### Depends On

- **Base Unit Interfaces** — `ISquadUnit`, `IBaseUnit`, `SquadMotionType`, `ISquadMovement`
- **BattleMech Interfaces** — `UnitType` enum
- **Unit Validation Framework** — `IUnitValidationRuleDefinition`, validation context
- **Personnel Category Rules** — shared `VAL-PERS-001` (squad size), `VAL-PERS-003` (primary weapon)
- **BLK Format** — `IBlkDocument` for parsing
- **Unit Store Architecture** — `createStoreRegistry` pattern, `clientSafeStorage`

### Depended On By

- **Force Builder** — Infantry platoons can be added to combat forces
- **Record Sheet Export** — Infantry record sheet generation
- **Compendium** — Infantry units in unit catalog
