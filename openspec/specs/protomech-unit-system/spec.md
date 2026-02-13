# protomech-unit-system Specification

## Purpose

Define the construction, state management, serialization, and customizer UI rules for ProtoMech units. ProtoMechs are Clan-exclusive proto-scale combat walkers that operate in points (typically 5 units). This spec covers weight classes, structure/armor by location, equipment mounting, main gun system, special systems (glider, quad, myomer booster), BLK format parsing, point composition mechanics, validation, and the customizer workflow.

## Non-Goals

- Combat mechanics (damage resolution, hit location tables, critical hits) are OUT OF SCOPE
- Pilot/warrior skill progression is OUT OF SCOPE
- Battle Value 2.0 detailed calculation beyond simplified armor/movement-based formula is OUT OF SCOPE
- Campaign-level ProtoMech repair and replacement is OUT OF SCOPE
- Inner Sphere ProtoMech variants are OUT OF SCOPE (ProtoMechs are Clan-only)

## Requirements

### Requirement: Clan-Only Tech Base

The system SHALL enforce ProtoMechs as Clan-exclusive technology.

#### Scenario: Default tech base

- **WHEN** creating or parsing a ProtoMech unit
- **THEN** tech base SHALL always be set to `Clan`
- **AND** rules level SHALL default to `Advanced`

#### Scenario: Non-Clan tech base warning

- **WHEN** a ProtoMech unit has a tech base other than `Clan`
- **THEN** validation SHALL produce a warning: "ProtoMechs are Clan-only technology"

### Requirement: Weight Classes

The system SHALL support three ProtoMech weight classes based on individual unit tonnage (2-9 tons).

#### Scenario: Light ProtoMech (2-4 tons)

- **WHEN** individual ProtoMech tonnage is 2, 3, or 4 tons
- **THEN** weight class SHALL be `Light`

#### Scenario: Medium ProtoMech (5-6 tons)

- **WHEN** individual ProtoMech tonnage is 5 or 6 tons
- **THEN** weight class SHALL be `Medium`

#### Scenario: Heavy ProtoMech (7-9 tons)

- **WHEN** individual ProtoMech tonnage is 7, 8, or 9 tons
- **THEN** weight class SHALL be `Heavy`

#### Scenario: Tonnage clamping

- **WHEN** setting ProtoMech tonnage via the store
- **THEN** the system SHALL clamp the value to the range 2-9 tons
- **AND** recalculate cruise MP as `max(1, 10 - tonnage)`
- **AND** recalculate flank MP as `floor(cruiseMP * 1.5)`
- **AND** recalculate engine rating as `tonnage * cruiseMP`

#### Scenario: Invalid weight validation

- **WHEN** a ProtoMech weighs less than 2 tons
- **THEN** validation SHALL produce an error: "ProtoMech must be at least 2 tons"
- **WHEN** a ProtoMech weighs more than 9 tons
- **THEN** validation SHALL produce an error: "ProtoMech cannot exceed 9 tons"

### Requirement: Tonnage Options

The customizer UI SHALL present ProtoMech tonnage as a discrete selector.

#### Scenario: Available tonnage values

- **WHEN** configuring ProtoMech tonnage in the customizer
- **THEN** the system SHALL offer: 2, 3, 4, 5, 6, 7, 8, 9 tons

### Requirement: Chassis Variants

The system SHALL support biped, quad, and glider ProtoMech configurations.

#### Scenario: Biped (default)

- **WHEN** creating a ProtoMech without specifying chassis variant
- **THEN** `isQuad` SHALL be `false`
- **AND** `isGlider` SHALL be `false`

#### Scenario: Quad ProtoMech

- **WHEN** the raw tag `quad` is `"true"` or `"1"` in a BLK document
- **THEN** `isQuad` SHALL be set to `true`
- **AND** quad ProtoMechs SHALL NOT have main guns (validation error if main gun equipped)

#### Scenario: Glider ProtoMech

- **WHEN** the raw tag `glider` is `"true"` or `"1"` in a BLK document
- **THEN** `isGlider` SHALL be set to `true`
- **AND** glider ProtoMechs SHALL require at least 2 jump MP
- **AND** validation SHALL produce an error if jump MP is less than 2: "Glider ProtoMechs require at least 2 jump MP"

### Requirement: ProtoMech Locations

The system SHALL define six equipment/armor locations for ProtoMechs.

#### Scenario: Standard locations

- **WHEN** configuring a ProtoMech
- **THEN** the system SHALL support:
  - `Head` - cockpit area
  - `Torso` - main body (default equipment location)
  - `Left Arm` - left appendage
  - `Right Arm` - right appendage
  - `Legs` - lower body
  - `Main Gun` - dedicated heavy weapon mount

#### Scenario: Main Gun location visibility

- **WHEN** the ProtoMech does NOT have a main gun
- **THEN** the `Main Gun` location SHALL be hidden from armor allocation UI
- **AND** main gun armor SHALL be 0

### Requirement: Internal Structure

The system SHALL calculate internal structure points per location based on tonnage.

#### Scenario: Structure calculation from handler

- **WHEN** parsing a ProtoMech from BLK format
- **THEN** internal structure SHALL be calculated as:
  - Head: 1 (fixed)
  - Torso: `ceil(tonnage / 2)`
  - Left Arm: `ceil(tonnage / 4)`
  - Right Arm: `ceil(tonnage / 4)`
  - Legs: `ceil(tonnage / 3)`
  - Main Gun: 1 (fixed)

#### Scenario: Structure calculation from store default

- **WHEN** creating a new ProtoMech via the store factory
- **THEN** internal structure SHALL be calculated as:
  - Head: `max(1, floor(base * 0.5))` where `base = ceil(tonnage / 2)`
  - Torso: `base + 2`
  - Left Arm: `max(1, floor(base * 0.75))`
  - Right Arm: `max(1, floor(base * 0.75))`
  - Legs: `base + 1`
  - Main Gun: 1

### Requirement: Armor Allocation

The system SHALL track armor points per location independently.

#### Scenario: Empty armor allocation

- **WHEN** creating a new ProtoMech
- **THEN** all armor locations SHALL start at 0

#### Scenario: Setting location armor

- **WHEN** setting armor for a specific location
- **THEN** the value SHALL be clamped to minimum 0
- **AND** the store SHALL mark the unit as modified

#### Scenario: Auto-allocate armor

- **WHEN** invoking auto armor allocation
- **THEN** total available armor SHALL be `tonnage * 6`
- **AND** distribution SHALL be:
  - Head: `floor(maxArmor * 0.10)`
  - Torso: `floor(maxArmor * 0.35)`
  - Left Arm: `floor(maxArmor * 0.10)`
  - Right Arm: `floor(maxArmor * 0.10)`
  - Legs: `floor(maxArmor * 0.25)`
  - Main Gun: 2 if `hasMainGun`, otherwise 0

#### Scenario: Clear all armor

- **WHEN** clearing all armor
- **THEN** all six locations SHALL be set to 0

#### Scenario: BLK armor parsing order

- **WHEN** parsing armor from a BLK document's `armor` array
- **THEN** the array SHALL be mapped to locations in order: Head, Torso, Left Arm, Right Arm, Legs, Main Gun

### Requirement: Movement

The system SHALL track cruise, flank, and jump movement points.

#### Scenario: Cruise MP

- **WHEN** setting cruise MP
- **THEN** the value SHALL be clamped to minimum 1
- **AND** flank MP SHALL be recalculated as `floor(cruiseMP * 1.5)`
- **AND** engine rating SHALL be recalculated as `tonnage * cruiseMP`

#### Scenario: Flank MP (derived)

- **WHEN** displaying flank MP
- **THEN** flank MP SHALL be `floor(cruiseMP * 1.5)`
- **AND** flank MP SHALL be read-only in the UI

#### Scenario: Jump MP

- **WHEN** setting jump MP
- **THEN** the value SHALL be clamped to minimum 0
- **AND** the UI SHALL enforce maximum of `cruiseMP`

#### Scenario: Default cruise MP from tonnage

- **WHEN** creating a new ProtoMech with a given tonnage
- **THEN** default cruise MP SHALL be `max(1, 10 - tonnage)`

#### Scenario: Movement validation

- **WHEN** validating movement
- **THEN** cruise MP MUST be at least 1
- **AND** validation SHALL produce an error if cruise MP is less than 1: "ProtoMech must have at least 1 cruise MP"

#### Scenario: Motion type derivation

- **WHEN** parsing from BLK format
- **THEN** motion type SHALL be `Jump` if `jumpMP > 0`, otherwise `Foot`

### Requirement: Engine Rating

The system SHALL calculate engine rating from tonnage and cruise MP.

#### Scenario: Engine rating formula

- **WHEN** calculating engine rating
- **THEN** engine rating SHALL be `tonnage * cruiseMP`

#### Scenario: Setting engine rating directly

- **WHEN** engine rating is set directly (e.g., from BLK parsing)
- **THEN** cruise MP SHALL be recalculated as `floor(engineRating / tonnage)`
- **AND** flank MP SHALL be recalculated as `floor(cruiseMP * 1.5)`

### Requirement: Main Gun System

The system SHALL support an optional dedicated main gun mount.

#### Scenario: Enabling main gun

- **WHEN** `hasMainGun` is set to `true`
- **THEN** the `Main Gun` location SHALL be available for equipment and armor
- **AND** main gun presence SHALL be detected from equipment location during BLK parsing

#### Scenario: Quad main gun restriction

- **WHEN** a quad ProtoMech has main gun equipment
- **THEN** validation SHALL produce an error: "Quad ProtoMechs cannot have main guns"

#### Scenario: Main gun detection during parsing

- **WHEN** parsing a BLK document
- **THEN** `hasMainGun` SHALL be `true` if any equipment has location `Main Gun`

### Requirement: Special Systems

The system SHALL support three optional ProtoMech special systems.

#### Scenario: Myomer Booster

- **WHEN** raw tag `myomerbooster` is `"true"` or `"1"`
- **THEN** `hasMyomerBooster` SHALL be `true`
- **AND** cost SHALL increase by 100,000 C-bills per unit

#### Scenario: Magnetic Clamps

- **WHEN** raw tag `magneticclamps` is `"true"` or `"1"`
- **THEN** `hasMagneticClamps` SHALL be `true`
- **AND** cost SHALL increase by 75,000 C-bills per unit

#### Scenario: Extended Torso Twist

- **WHEN** raw tag `extendedtorsotwist` is `"true"` or `"1"`
- **THEN** `hasExtendedTorsoTwist` SHALL be `true`

#### Scenario: Default special systems

- **WHEN** raw tags are absent
- **THEN** all special system flags SHALL default to `false`

### Requirement: Equipment Mounting

The system SHALL manage equipment mounted on ProtoMechs with location tracking.

#### Scenario: Mounted equipment properties

- **WHEN** equipment is mounted
- **THEN** each mount SHALL track:
  - `id` - unique mount instance ID
  - `equipmentId` - reference to equipment definition
  - `name` - display name
  - `location` - one of the six ProtoMech locations
  - `linkedAmmoId` - optional linked ammunition mount ID

#### Scenario: Default equipment location

- **WHEN** adding equipment without specifying a location
- **THEN** the system SHALL default to `Torso`

#### Scenario: Equipment ID uniqueness

- **WHEN** multiple equipment items are mounted
- **THEN** each mount SHALL have a unique `id`

#### Scenario: Ammo linking

- **WHEN** linking ammunition to a weapon
- **THEN** the weapon mount's `linkedAmmoId` SHALL be set to the ammo mount's `id`
- **AND** unlinking SHALL set `linkedAmmoId` to `undefined`

#### Scenario: Equipment location normalization from BLK

- **WHEN** parsing equipment from `equipmentByLocation`
- **THEN** `"head"` or `"head equipment"` SHALL normalize to `Head`
- **AND** `"torso"` or `"torso equipment"` SHALL normalize to `Torso`
- **AND** `"main gun"` or `"main gun equipment"` SHALL normalize to `Main Gun`
- **AND** `"left arm"` or `"left arm equipment"` SHALL normalize to `Left Arm`
- **AND** `"right arm"` or `"right arm equipment"` SHALL normalize to `Right Arm`
- **AND** `"legs"` or `"legs equipment"` SHALL normalize to `Legs`
- **AND** unknown locations SHALL default to `Torso`

### Requirement: Point Composition

The system SHALL model ProtoMechs operating in points (tactical groups).

#### Scenario: Default point size

- **WHEN** creating a new ProtoMech
- **THEN** point size SHALL default to 5

#### Scenario: Point size range

- **WHEN** setting point size via the store
- **THEN** the value SHALL be clamped to the range 1-5

#### Scenario: Unusual point size warning

- **WHEN** point size is outside the range 1-6 during validation
- **THEN** validation SHALL produce a warning: "Unusual point size (standard is 5)"

#### Scenario: Total weight calculation

- **WHEN** calculating total unit weight
- **THEN** total weight SHALL be `weightPerUnit * pointSize`

#### Scenario: BV scaling by point

- **WHEN** calculating Battle Value
- **THEN** per-unit BV SHALL be multiplied by `pointSize`

#### Scenario: Cost scaling by point

- **WHEN** calculating total cost
- **THEN** per-unit cost SHALL be multiplied by `pointSize`

### Requirement: BLK Format Parsing

The system SHALL parse ProtoMech units from BLK documents.

#### Scenario: Standard BLK parsing

- **WHEN** a BLK document has `mappedUnitType` of `PROTOMECH`
- **THEN** the handler SHALL parse all ProtoMech-specific fields
- **AND** return `success: true` with a fully populated `IProtoMech`

#### Scenario: Minimal BLK document defaults

- **WHEN** parsing a BLK document with only required fields
- **THEN** optional fields SHALL use defaults:
  - pointSize: 5 (from `trooperCount`, default 5)
  - cruiseMP: 4 (if unspecified)
  - jumpMP: 0 (if unspecified)
  - all special systems: `false`
  - motion type: `Foot` (if jumpMP is 0)

#### Scenario: Point size from trooperCount

- **WHEN** a BLK document has a `trooperCount` field
- **THEN** `pointSize` SHALL be set to `trooperCount`
- **AND** `squadSize` SHALL equal `pointSize`

### Requirement: BLK Format Serialization

The system SHALL serialize ProtoMech units to a standard format.

#### Scenario: Serialization output

- **WHEN** serializing a ProtoMech unit
- **THEN** the output SHALL include `configuration` (either `"Quad"` or `"Biped"`) and `rulesLevel`

#### Scenario: Deserialization status

- **WHEN** attempting to deserialize a ProtoMech unit
- **THEN** the system SHALL return a failure result: "ProtoMech deserialization not yet implemented"

### Requirement: Cost Calculation

The system SHALL calculate ProtoMech cost based on tonnage and special equipment.

#### Scenario: Base cost formula

- **WHEN** calculating cost
- **THEN** base cost per unit SHALL be `weightPerUnit * 200,000` C-bills
- **AND** engine cost per unit SHALL be `engineRating * 1,000` C-bills
- **AND** glider cost per unit SHALL add 50,000 C-bills if `isGlider`
- **AND** myomer booster cost per unit SHALL add 100,000 C-bills if `hasMyomerBooster`
- **AND** magnetic clamps cost per unit SHALL add 75,000 C-bills if `hasMagneticClamps`
- **AND** total cost SHALL be `costPerUnit * pointSize`

### Requirement: Simplified BV Calculation

The system SHALL calculate a simplified Battle Value for ProtoMech units.

#### Scenario: Base BV from armor and movement

- **WHEN** calculating BV
- **THEN** base BV per unit SHALL be `armorPerTrooper * 15`
- **AND** movement BV per unit SHALL add `cruiseMP * 10`
- **AND** if `jumpMP > 0`, jump BV per unit SHALL add `jumpMP * 15`
- **AND** total BV SHALL be `perUnitBV * pointSize`
- **AND** the result SHALL be rounded to the nearest integer

## Data Model

### State Shape: ProtoMechState

The store state SHALL conform to the following shape:

```typescript
interface ProtoMechState {
  // Identity
  readonly id: string;
  name: string;
  chassis: string;
  model: string;
  mulId: string; // MUL ID, "-1" for custom
  year: number; // Introduction year, default 3060
  rulesLevel: RulesLevel;

  // Classification
  techBase: TechBase; // Always Clan
  unitType: UnitType.PROTOMECH; // Always PROTOMECH
  tonnage: number; // 2-9 tons per individual unit
  pointSize: number; // 1-5 units per point
  isQuad: boolean;
  isGlider: boolean;

  // Movement
  engineRating: number; // tonnage * cruiseMP
  cruiseMP: number; // min 1
  flankMP: number; // floor(cruiseMP * 1.5), derived
  jumpMP: number; // min 0

  // Structure & Armor
  structureByLocation: IProtoMechArmorAllocation;
  armorByLocation: IProtoMechArmorAllocation;
  armorType: number; // 0 = Standard ProtoMech armor

  // Main Gun
  hasMainGun: boolean;

  // Special Systems
  hasMyomerBooster: boolean;
  hasMagneticClamps: boolean;
  hasExtendedTorsoTwist: boolean;

  // Equipment
  equipment: IProtoMechMountedEquipment[];

  // Metadata
  isModified: boolean;
  createdAt: number;
  lastModifiedAt: number;
}
```

### Interface: IProtoMechArmorAllocation

```typescript
interface IProtoMechArmorAllocation {
  [key: string]: number;
  [ProtoMechLocation.HEAD]: number;
  [ProtoMechLocation.TORSO]: number;
  [ProtoMechLocation.LEFT_ARM]: number;
  [ProtoMechLocation.RIGHT_ARM]: number;
  [ProtoMechLocation.LEGS]: number;
  [ProtoMechLocation.MAIN_GUN]: number;
}
```

### Interface: IProtoMech

The parsed domain model SHALL extend `ISquadUnit`:

```typescript
interface IProtoMech extends ISquadUnit {
  readonly unitType: UnitType.PROTOMECH;
  readonly weightPerUnit: number; // Individual tonnage (2-9)
  readonly pointSize: number; // Units per point (typically 5)
  readonly engineRating: number;
  readonly cruiseMP: number;
  readonly jumpMP: number;
  readonly hasMainGun: boolean;
  readonly armorByLocation: Record<ProtoMechLocation, number>;
  readonly structureByLocation: Record<ProtoMechLocation, number>;
  readonly equipment: readonly IProtoMechMountedEquipment[];

  // Chassis variants
  readonly isGlider: boolean;
  readonly isQuad: boolean;

  // Special systems
  readonly hasMyomerBooster: boolean;
  readonly hasMagneticClamps: boolean;
  readonly hasExtendedTorsoTwist: boolean;
}
```

### Interface: IProtoMechMountedEquipment

```typescript
interface IProtoMechMountedEquipment {
  readonly id: string;
  readonly equipmentId: string;
  readonly name: string;
  readonly location: ProtoMechLocation;
  readonly linkedAmmoId?: string;
}
```

### Enum: ProtoMechLocation

```typescript
enum ProtoMechLocation {
  HEAD = 'Head',
  TORSO = 'Torso',
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',
  LEGS = 'Legs',
  MAIN_GUN = 'Main Gun',
}
```

## Validation Rules

### Rule: ProtoMech Weight Range

- **Applies to**: ProtoMech only
- **Severity**: ERROR
- **Condition**: `weightPerUnit` MUST be between 2 and 9 tons inclusive
- **Error (under)**: "ProtoMech must be at least 2 tons"
- **Error (over)**: "ProtoMech cannot exceed 9 tons"

### Rule: ProtoMech Minimum Cruise MP

- **Applies to**: ProtoMech only
- **Severity**: ERROR
- **Condition**: `cruiseMP` MUST be at least 1
- **Error**: "ProtoMech must have at least 1 cruise MP"

### Rule: Quad Main Gun Restriction

- **Applies to**: Quad ProtoMech only
- **Severity**: ERROR
- **Condition**: If `isQuad` is `true`, `hasMainGun` MUST be `false`
- **Error**: "Quad ProtoMechs cannot have main guns"

### Rule: Glider Jump MP Requirement

- **Applies to**: Glider ProtoMech only
- **Severity**: ERROR
- **Condition**: If `isGlider` is `true`, `jumpMP` MUST be at least 2
- **Error**: "Glider ProtoMechs require at least 2 jump MP"

### Rule: Clan-Only Tech Base

- **Applies to**: ProtoMech only
- **Severity**: WARNING
- **Condition**: `techBase` SHOULD be `Clan`
- **Warning**: "ProtoMechs are Clan-only technology"

### Rule: Point Size Range

- **Applies to**: ProtoMech only
- **Severity**: WARNING
- **Condition**: `pointSize` SHOULD be between 1 and 6 inclusive
- **Warning**: "Unusual point size (standard is 5)"

### Rule: VAL-PERS-001 - Squad Size Valid (shared)

- **Applies to**: Infantry, Battle Armor (ProtoMech uses `pointSize` instead)
- **Note**: ProtoMechs share the `PersonnelInterfaces.ts` file but use `pointSize` rather than `squadSize` for point composition. The VAL-PERS-001 rule applies to Infantry and Battle Armor; ProtoMech point size is validated by the handler's own `validateTypeSpecificRules`.

## Store Architecture

### Store Factory Pattern

The ProtoMech store SHALL use the same factory pattern as other unit types:

- `createProtoMechStore(initialState)` - Creates a Zustand store with persist middleware
- `createNewProtoMechStore(options)` - Creates with default state from options
- Storage key: `megamek-protomech-{id}`
- `skipHydration: true` for SSR safety
- `partialize` SHALL serialize all state fields (not actions)

### Store Registry

The registry SHALL manage active ProtoMech store instances:

- `getProtoMechStore(id)` - Retrieve store by ID
- `hasProtoMechStore(id)` - Check existence
- `getAllProtoMechIds()` - List all registered IDs
- `getProtoMechStoreCount()` - Count of active stores
- `hydrateOrCreateProtoMech(id, fallback)` - Load from localStorage or create new
- `createAndRegisterProtoMech(options)` - Create and register in one step
- `duplicateProtoMech(sourceId, newName?)` - Deep copy with new ID (copies movement, armor, special systems)
- `deleteProtoMech(id)` - Remove from registry and localStorage
- `clearAllProtoMechStores(clearStorage?)` - Full cleanup
- `createProtoMechFromFullState(state)` - Register from complete state (e.g., after BLK parsing)
- Invalid UUIDs SHALL be replaced with generated valid UUIDs (with warning log)

### Store Actions

Actions SHALL set the relevant fields plus `isModified: true` and `lastModifiedAt: Date.now()`:

- **Identity**: setName, setChassis (also updates `name`), setModel (also updates `name`), setMulId, setYear, setRulesLevel
- **Classification**: setTonnage (clamped 2-9, recalculates cruiseMP/flankMP/engineRating), setPointSize (clamped 1-5), setQuad, setGlider
- **Movement**: setEngineRating (recalculates cruiseMP/flankMP), setCruiseMP (min 1, recalculates flankMP/engineRating), setJumpMP (min 0)
- **Armor**: setArmorType, setLocationArmor (min 0), setLocationStructure (min 0), autoAllocateArmor, clearAllArmor
- **Main Gun**: setMainGun
- **Special Systems**: setMyomerBooster, setMagneticClamps, setExtendedTorsoTwist
- **Equipment**: addEquipment (returns instance ID), removeEquipment, updateEquipmentLocation, linkAmmo, clearAllEquipment
- **Metadata**: markModified

### React Context

- `ProtoMechStoreContext` provides the active store
- `useProtoMechStore(selector)` hook with mandatory context check
- `useProtoMechStoreApi()` returns full store API

## Customizer UI

### Component Hierarchy

The ProtoMech customizer SHALL use a single-tab layout:

- `ProtoMechCustomizer` - Root component, wraps children in store context
- `ProtoMechStructureTab` - Main configuration panel

### ProtoMechCustomizer

- **WHEN** rendered
- **THEN** it SHALL accept a `store: StoreApi<ProtoMechStore>` prop
- **AND** wrap children in `ProtoMechStoreContext.Provider`
- **AND** display a header with "ProtoMech Configuration"
- **AND** render `ProtoMechStructureTab` as the main content

### ProtoMechStructureTab Sections

#### Section: Identity

- Chassis Name (text input)
- Model/Variant (text input)

#### Section: Chassis Configuration

- Tonnage (select: 2-9 tons)
- Quad (checkbox)
- Glider (checkbox)
- Main Gun Mount (checkbox)

#### Section: Movement

- Cruise MP (number input, min 1, max 10)
- Flank MP (read-only computed display)
- Jump MP (number input, min 0, max cruiseMP)

#### Section: Armor Allocation

- Auto button (triggers `autoAllocateArmor`)
- Clear button (triggers `clearAllArmor`, styled red)
- Total Armor display
- Per-location armor inputs (number) with structure maximum display
- Main Gun location hidden when `hasMainGun` is `false`

### Read-Only Mode

- **WHEN** `readOnly` is `true`
- **THEN** all inputs SHALL be disabled
- **AND** armor auto/clear buttons SHALL be disabled

## Handler Architecture

### ProtoMechUnitHandler

The handler SHALL extend `AbstractUnitTypeHandler<IProtoMech>`:

- `unitType`: `UnitType.PROTOMECH`
- `displayName`: `"ProtoMech"`
- `getLocations()`: Returns all 6 `ProtoMechLocation` values
- `canHandle(doc)`: Returns `true` when `mappedUnitType === PROTOMECH`

### Parsing Pipeline

1. `parseCommonFields(doc)` - Extracts name, model, year, tonnage, tech base (from parent)
2. `parseTypeSpecificFields(doc)` - Extracts all ProtoMech-specific fields including point size, movement, armor by location, structure, equipment, special systems
3. `combineFields(common, specific)` - Merges into final `IProtoMech`, forces `techBase: Clan` and `rulesLevel: Advanced`

### Boolean Tag Parsing

- Raw tags are parsed as booleans: `"true"` or `"1"` -> `true`, anything else -> `false`
- Array values use the first element

### Weight Class Determination

- **WHEN** determining weight class from `weightPerUnit`
- **THEN**: 2-4 tons -> `Light`, 5-6 tons -> `Medium`, 7-9 tons -> `Heavy`

## Dependencies

- **PersonnelInterfaces** (`src/types/unit/PersonnelInterfaces.ts`): Shared with Infantry and Battle Armor - defines `IProtoMech`, `IProtoMechMountedEquipment`, type guards
- **BaseUnitInterfaces** (`src/types/unit/BaseUnitInterfaces.ts`): `ISquadUnit`, `SquadMotionType`, `ISquadMovement`
- **UnitLocation** (`src/types/construction/UnitLocation.ts`): `ProtoMechLocation` enum
- **PersonnelCategoryRules** (`src/services/validation/rules/personnel/`): Shared validation rules (VAL-PERS-001 through VAL-PERS-003) — primarily Infantry/BattleArmor; ProtoMech validation is handler-specific
- **AbstractUnitTypeHandler**: Base handler class for BLK parsing/serialization
- **createStoreRegistry / clientSafeStorage**: Shared store infrastructure
- **BattleMechInterfaces**: `UnitType.PROTOMECH` enum value

## Implementation Files

| File                                                                | Purpose                                              | Lines |
| ------------------------------------------------------------------- | ---------------------------------------------------- | ----- |
| `src/types/unit/PersonnelInterfaces.ts`                             | IProtoMech, IProtoMechMountedEquipment, type guards  | ~410  |
| `src/stores/protoMechState.ts`                                      | State interface, armor allocation, defaults, factory | ~372  |
| `src/stores/useProtoMechStore.ts`                                   | Zustand store factory, context, hooks                | ~421  |
| `src/stores/protoMechStoreRegistry.ts`                              | Registry for active store instances                  | ~217  |
| `src/services/units/handlers/ProtoMechUnitHandler.ts`               | BLK parsing, validation, calculations                | ~456  |
| `src/components/customizer/protomech/ProtoMechCustomizer.tsx`       | Main customizer with store context                   | ~67   |
| `src/components/customizer/protomech/ProtoMechStructureTab.tsx`     | Structure/chassis/armor tab UI                       | ~285  |
| `src/services/validation/rules/personnel/PersonnelCategoryRules.ts` | Shared validation rules (Infantry/BA focused)        | ~203  |

## Known Limitations

- Deserialization from standard format is not yet implemented (returns failure)
- BV calculation is simplified (armor + movement only, no equipment BV contribution)
- Cost calculation uses simplified base costs without detailed equipment cost additions
- Internal structure calculation differs between handler (BLK parsing) and store (factory default) — both are simplified approximations
- The `isSquadUnit` type guard in `BaseUnitInterfaces.ts` does not include `PROTOMECH`, though `IProtoMech` extends `ISquadUnit`
- No ProtoMech-specific validation rules in `PersonnelCategoryRules.ts` — all ProtoMech validation is in the handler's `validateTypeSpecificRules`
- Glider cost increase is 50,000 C-bills but no additional movement or weight penalties are modeled
- Customizer has only one tab (Structure) — no separate equipment or preview tabs yet
