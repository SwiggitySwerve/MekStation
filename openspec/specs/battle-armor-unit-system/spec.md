# battle-armor-unit-system Specification

## Purpose

Define the construction, state management, serialization, and customizer UI rules for Battle Armor (BA) units. Battle Armor are squad-based powered armor suits where multiple troopers operate as a single tactical unit, sharing equipment loadouts. This spec covers chassis configuration, weight classes, manipulators, squad composition, equipment mounting, BLK format parsing, validation, and the customizer workflow.

## Non-Goals

- Combat mechanics (damage resolution, swarm attacks, anti-mech tactics) are OUT OF SCOPE
- Pilot/warrior skill progression is OUT OF SCOPE
- Battle Value 2.0 detailed calculation beyond simplified armor-based formula is OUT OF SCOPE
- Campaign-level BA repair and replacement is OUT OF SCOPE

## Requirements

### Requirement: Chassis Types

The system SHALL support two Battle Armor chassis types.

#### Scenario: Biped chassis (default)

- **WHEN** creating or parsing a Battle Armor unit
- **THEN** the chassis type SHALL default to `Biped`
- **AND** biped chassis SHALL support left and right arm manipulators

#### Scenario: Quad chassis

- **WHEN** the chassis string contains `"quad"` (case-insensitive)
- **THEN** the chassis type SHALL be set to `Quad`

#### Scenario: Unknown chassis string

- **WHEN** the chassis string is unrecognized or absent
- **THEN** the system SHALL default to `Biped`

### Requirement: Weight Classes

The system SHALL support five Battle Armor weight classes with per-trooper weight thresholds in kilograms.

#### Scenario: PA(L) - Power Armor Light (code 0)

- **WHEN** weight class code is `0`
- **THEN** weight class SHALL be `PA(L)`
- **AND** per-trooper weight range SHALL be 80-400 kg
- **AND** maximum armor per trooper SHALL be 2

#### Scenario: Light (code 1)

- **WHEN** weight class code is `1`
- **THEN** weight class SHALL be `Light`
- **AND** per-trooper weight range SHALL be 401-750 kg
- **AND** maximum armor per trooper SHALL be 5

#### Scenario: Medium (code 2)

- **WHEN** weight class code is `2`
- **THEN** weight class SHALL be `Medium`
- **AND** per-trooper weight range SHALL be 751-1000 kg
- **AND** maximum armor per trooper SHALL be 8

#### Scenario: Heavy (code 3)

- **WHEN** weight class code is `3`
- **THEN** weight class SHALL be `Heavy`
- **AND** per-trooper weight range SHALL be 1001-1500 kg
- **AND** maximum armor per trooper SHALL be 10

#### Scenario: Assault (code 4)

- **WHEN** weight class code is `4`
- **THEN** weight class SHALL be `Assault`
- **AND** per-trooper weight range SHALL be 1501-2000 kg
- **AND** maximum armor per trooper SHALL be 14

#### Scenario: Default weight class

- **WHEN** weight class code is unspecified or invalid
- **THEN** the system SHALL default to `Medium`

### Requirement: Weight Per Trooper Calculation

The system SHALL calculate weight per trooper from the total squad tonnage.

#### Scenario: Standard weight calculation

- **WHEN** parsing a BLK document with `tonnage` and `trooperCount`
- **THEN** `weightPerTrooper` SHALL be `(tonnage * 1000) / trooperCount` in kilograms

#### Scenario: Total weight calculation

- **WHEN** calculating total BA unit weight
- **THEN** total weight SHALL be `(weightPerTrooper / 1000) * squadSize` in tons

### Requirement: Squad Composition

The system SHALL enforce squad size constraints for Battle Armor units.

#### Scenario: Valid squad sizes

- **WHEN** setting squad size
- **THEN** the system SHALL clamp the value to the range 1-6
- **AND** typical Inner Sphere squads SHALL have 4 troopers
- **AND** typical Clan squads (e.g., Elementals) SHALL have 5 troopers

#### Scenario: Default squad size

- **WHEN** trooper count is unspecified or zero in a BLK document
- **THEN** the system SHALL default to 4 troopers

#### Scenario: Unusual squad size warning

- **WHEN** squad size is outside the range 1-6
- **THEN** parsing SHALL produce a warning
- **AND** validation SHALL produce an error for sizes outside 1-6

### Requirement: Motion Types

The system SHALL support multiple motion types for Battle Armor.

#### Scenario: Supported motion types

- **WHEN** configuring BA movement
- **THEN** the system SHALL support: `Foot`, `Jump`, `VTOL`, `UMU`, `Mechanized`

#### Scenario: Motion type parsing

- **WHEN** parsing motion type from BLK format
- **THEN** `"jump"` SHALL map to `Jump`
- **AND** `"leg"` or `"foot"` SHALL map to `Foot`
- **AND** `"vtol"` SHALL map to `VTOL`
- **AND** `"umu"` SHALL map to `UMU`
- **AND** `"mechanized"` SHALL map to `Mechanized`

#### Scenario: Default motion type

- **WHEN** motion type is unspecified or unrecognized
- **THEN** the system SHALL default to `Jump`

### Requirement: Movement Points

The system SHALL track ground, jump, and underwater movement.

#### Scenario: Ground MP

- **WHEN** parsing ground MP from BLK `cruiseMP`
- **THEN** ground MP SHALL default to 1 if unspecified
- **AND** ground MP SHALL be clamped to minimum 0

#### Scenario: Jump MP

- **WHEN** parsing jump MP from BLK `jumpingMP`
- **THEN** jump MP SHALL default to 0 if unspecified
- **AND** jump MP SHALL be clamped to minimum 0

#### Scenario: UMU MP

- **WHEN** parsing UMU MP from raw tag `umump`
- **THEN** UMU MP SHALL default to 0 if absent
- **AND** UMU MP SHALL be clamped to minimum 0

#### Scenario: Mechanical jump boosters

- **WHEN** raw tag `mechanicaljumpboosters` is `"true"`
- **THEN** `hasMechanicalJumpBoosters` SHALL be set to `true`
- **AND** these replace standard jump jets

### Requirement: Manipulator Types

The system SHALL support 11 manipulator types for left and right arms.

#### Scenario: Available manipulator types

- **WHEN** configuring manipulators
- **THEN** the system SHALL support:
  - `None` (default)
  - `Armored Glove`
  - `Basic`
  - `Basic/Mine Clearance`
  - `Battle`
  - `Battle Vibro`
  - `Heavy Battle`
  - `Heavy Battle Vibro`
  - `Cargo Lifter`
  - `Industrial Drill`
  - `Salvage Arm`

#### Scenario: Manipulator parsing from BLK

- **WHEN** parsing manipulators from raw tags `leftmanipulator`/`rightmanipulator`
- **THEN** the parser SHALL match substrings (case-insensitive) in priority order:
  1. `"armored glove"` -> `Armored Glove`
  2. `"heavy battle vibro"` -> `Heavy Battle Vibro`
  3. `"heavy battle"` -> `Heavy Battle`
  4. `"battle vibro"` -> `Battle Vibro`
  5. `"battle"` -> `Battle`
  6. `"basic mine"` -> `Basic/Mine Clearance`
  7. `"basic"` -> `Basic`
  8. `"cargo"` -> `Cargo Lifter`
  9. `"drill"` -> `Industrial Drill`
  10. `"salvage"` -> `Salvage Arm`
- **AND** unrecognized values SHALL default to `None`

#### Scenario: Default manipulators

- **WHEN** manipulator tags are absent
- **THEN** both left and right SHALL default to `None`

### Requirement: Equipment Mounting

The system SHALL manage equipment mounted on Battle Armor with location tracking.

#### Scenario: Equipment locations

- **WHEN** mounting equipment
- **THEN** the system SHALL support five locations:
  - `Squad` - shared across entire squad (default)
  - `Body` - individual trooper body
  - `Left Arm` - left arm/manipulator
  - `Right Arm` - right arm/manipulator
  - `Turret` - turret mount (if equipped)

#### Scenario: Mounted equipment properties

- **WHEN** equipment is mounted
- **THEN** each mount SHALL track:
  - `id` - unique mount instance ID
  - `equipmentId` - reference to equipment definition
  - `name` - display name
  - `location` - one of the five BA locations
  - `isAPMount` - whether this occupies the anti-personnel mount
  - `isTurretMounted` - whether this is turret-mounted
  - `isModular` - whether this can be field-swapped

#### Scenario: Default equipment location

- **WHEN** adding equipment without specifying a location
- **THEN** the system SHALL default to `Squad`

#### Scenario: Equipment ID uniqueness

- **WHEN** multiple equipment items are mounted
- **THEN** each mount SHALL have a unique `id`

### Requirement: Mount Options

The system SHALL support three special weapon mount types.

#### Scenario: Anti-personnel mount

- **WHEN** raw tag `apmount` is `"true"`
- **THEN** `hasAPMount` SHALL be `true`
- **AND** equipment parsed from `"AP Equipment"` location keys SHALL have `isAPMount: true`

#### Scenario: Modular mount

- **WHEN** raw tag `modularmount` is `"true"`
- **THEN** `hasModularMount` SHALL be `true`

#### Scenario: Turret mount

- **WHEN** raw tag `turretmount` is `"true"` or `"1"`
- **THEN** `hasTurretMount` SHALL be `true`
- **AND** equipment parsed from `"Turret Equipment"` location keys SHALL have `isTurretMounted: true` and location `Turret`

### Requirement: Special Systems

The system SHALL track BA special defensive systems.

#### Scenario: Stealth system

- **WHEN** raw tag `stealth` is `"true"`
- **THEN** `hasStealthSystem` SHALL be `true`
- **AND** `stealthType` MAY specify the variant

#### Scenario: Mimetic armor

- **WHEN** raw tag `mimetic` is `"true"`
- **THEN** `hasMimeticArmor` SHALL be `true`

#### Scenario: Fire-resistant armor

- **WHEN** raw tag `fireresistant` is `"true"`
- **THEN** `hasFireResistantArmor` SHALL be `true`

#### Scenario: Default special systems

- **WHEN** raw tags are absent
- **THEN** all special system flags SHALL default to `false`

### Requirement: Tech Base

The system SHALL determine tech base from the BLK type string.

#### Scenario: Clan tech base

- **WHEN** the type string contains `"clan"` (case-insensitive) and does NOT contain `"mixed"`
- **THEN** tech base SHALL be `Clan`

#### Scenario: Inner Sphere tech base

- **WHEN** the type string does not match Clan criteria
- **THEN** tech base SHALL be `Inner Sphere`

#### Scenario: Mixed tech handling

- **WHEN** the type string contains `"mixed"`
- **THEN** tech base SHALL default to `Inner Sphere`

### Requirement: Armor Per Trooper

The system SHALL enforce maximum armor per trooper based on weight class.

#### Scenario: Armor maximums by weight class

- **WHEN** validating armor per trooper
- **THEN** the system SHALL enforce:
  - PA(L): max 2
  - Light: max 5
  - Medium: max 8
  - Heavy: max 10
  - Assault: max 14
- **AND** exceeding the maximum SHALL produce a validation error

### Requirement: Assault BA Restrictions

Assault-class Battle Armor SHALL have specific capability restrictions.

#### Scenario: Swarm attack restriction

- **WHEN** a BA unit has weight class `Assault`
- **THEN** `canSwarm` SHALL be `false`
- **AND** validation SHALL error if `canSwarm` is `true`

#### Scenario: OmniMech mount restriction

- **WHEN** a BA unit has weight class `Assault`
- **THEN** `canMountOmni` SHALL be `false`
- **AND** validation SHALL error if `canMountOmni` is `true`

#### Scenario: Non-assault capabilities

- **WHEN** a BA unit is NOT weight class `Assault`
- **THEN** `canSwarm` SHALL be `true`
- **AND** `canMountOmni` SHALL be `true`

#### Scenario: Universal capabilities

- **WHEN** any BA unit is parsed
- **THEN** `canLegAttack` SHALL be `true`
- **AND** `canAntiMech` SHALL be `true`

### Requirement: BLK Format Parsing

The system SHALL parse Battle Armor units from BLK documents.

#### Scenario: Standard BLK parsing

- **WHEN** a BLK document has `mappedUnitType` of `BATTLE_ARMOR`
- **THEN** the handler SHALL parse all BA-specific fields
- **AND** return `success: true` with a fully populated `IBattleArmor`

#### Scenario: Minimal BLK document

- **WHEN** parsing a BLK document with only required fields
- **THEN** optional fields SHALL use defaults:
  - squadSize: 4
  - chassisType: Biped
  - motionType: Jump
  - groundMP: 1
  - jumpMP: 0
  - manipulators: None/None
  - all special systems: false

#### Scenario: Equipment location normalization

- **WHEN** parsing equipment from `equipmentByLocation`
- **THEN** `"Squad Equipment"` SHALL normalize to `Squad`
- **AND** `"Body Equipment"` SHALL normalize to `Body`
- **AND** `"Left Arm Equipment"` SHALL normalize to `Left Arm`
- **AND** `"Right Arm Equipment"` SHALL normalize to `Right Arm`
- **AND** `"Turret Equipment"` SHALL normalize to `Turret`
- **AND** unknown locations SHALL default to `Squad`

### Requirement: BLK Format Serialization

The system SHALL serialize Battle Armor units to a standard format.

#### Scenario: Serialization output

- **WHEN** serializing a Battle Armor unit
- **THEN** the output SHALL include `unitType`, `tonnage`, `chassis`, `configuration` (chassis type), and `rulesLevel`

#### Scenario: Deserialization status

- **WHEN** attempting to deserialize a Battle Armor unit
- **THEN** the system SHALL return a failure result indicating "not yet implemented"

### Requirement: Cost Calculation

The system SHALL calculate BA cost based on weight class and squad size.

#### Scenario: Cost by weight class

- **WHEN** calculating cost
- **THEN** base cost per trooper SHALL be:
  - PA(L): 100,000 C-bills
  - Light: 200,000 C-bills
  - Medium: 300,000 C-bills
  - Heavy: 400,000 C-bills
  - Assault: 500,000 C-bills
- **AND** total cost SHALL be `baseCost * squadSize`

### Requirement: Simplified BV Calculation

The system SHALL calculate a simplified Battle Value for BA units.

#### Scenario: Base BV from armor

- **WHEN** calculating BV
- **THEN** base BV SHALL be `armorPerTrooper * 20 * squadSize`

#### Scenario: Jump modifier

- **WHEN** the unit has `jumpMP > 0`
- **THEN** BV SHALL be multiplied by 1.1
- **AND** the result SHALL be rounded to the nearest integer

## Data Model

### State Shape: BattleArmorState

The store state SHALL conform to the following shape:

```typescript
interface BattleArmorState {
  // Identity
  readonly id: string;
  name: string;
  chassis: string;
  model: string;
  mulId: string; // MUL ID, "-1" for custom
  year: number; // Introduction year, default 3050
  rulesLevel: RulesLevel;

  // Classification
  techBase: TechBase; // IS or Clan
  unitType: UnitType.BATTLE_ARMOR; // Always BATTLE_ARMOR
  chassisType: BattleArmorChassisType; // Biped | Quad
  weightClass: BattleArmorWeightClass; // PA(L) | Light | Medium | Heavy | Assault
  weightPerTrooper: number; // Kilograms

  // Squad Configuration
  squadSize: number; // 1-6 troopers
  motionType: SquadMotionType;
  groundMP: number;
  jumpMP: number;
  hasMechanicalJumpBoosters: boolean;
  umuMP: number;

  // Manipulators
  leftManipulator: ManipulatorType;
  rightManipulator: ManipulatorType;

  // Armor
  armorType: number;
  armorPerTrooper: number;

  // Mount Options
  hasAPMount: boolean;
  hasModularMount: boolean;
  hasTurretMount: boolean;

  // Special Systems
  hasStealthSystem: boolean;
  stealthType?: string;
  hasMimeticArmor: boolean;
  hasFireResistantArmor: boolean;

  // Equipment
  equipment: IBattleArmorMountedEquipment[];

  // Metadata
  isModified: boolean;
  createdAt: number;
  lastModifiedAt: number;
}
```

### Interface: IBattleArmor

The parsed domain model SHALL extend `ISquadUnit`:

```typescript
interface IBattleArmor extends ISquadUnit {
  readonly unitType: UnitType.BATTLE_ARMOR;
  readonly chassisType: BattleArmorChassisType;
  readonly baWeightClass: BattleArmorWeightClass;
  readonly weightPerTrooper: number;
  readonly squadSize: number;
  readonly leftManipulator: ManipulatorType;
  readonly rightManipulator: ManipulatorType;
  readonly motionType: SquadMotionType;
  readonly jumpMP: number;
  readonly hasMechanicalJumpBoosters: boolean;
  readonly umuMP: number;
  readonly armorType: number;
  readonly armorPerTrooper: number;
  readonly equipment: readonly IBattleArmorMountedEquipment[];

  // Mount options
  readonly hasAPMount: boolean;
  readonly hasModularMount: boolean;
  readonly hasTurretMount: boolean;

  // Special systems
  readonly hasStealthSystem: boolean;
  readonly stealthType?: string;
  readonly hasMimeticArmor: boolean;
  readonly hasFireResistantArmor: boolean;

  // Capabilities (derived)
  readonly canSwarm: boolean;
  readonly canLegAttack: boolean;
  readonly canMountOmni: boolean;
  readonly canAntiMech: boolean;
}
```

### Interface: IBattleArmorMountedEquipment

```typescript
interface IBattleArmorMountedEquipment {
  readonly id: string;
  readonly equipmentId: string;
  readonly name: string;
  readonly location: BattleArmorLocation; // Squad | Body | Left Arm | Right Arm | Turret
  readonly isAPMount: boolean;
  readonly isTurretMounted: boolean;
  readonly isModular: boolean;
}
```

### Enum: BattleArmorChassisType

```typescript
enum BattleArmorChassisType {
  BIPED = 'Biped',
  QUAD = 'Quad',
}
```

### Enum: BattleArmorWeightClass

```typescript
enum BattleArmorWeightClass {
  PA_L = 'PA(L)',
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  HEAVY = 'Heavy',
  ASSAULT = 'Assault',
}
```

### Enum: ManipulatorType

```typescript
enum ManipulatorType {
  NONE = 'None',
  ARMORED_GLOVE = 'Armored Glove',
  BASIC = 'Basic',
  BASIC_MINE_CLEARANCE = 'Basic/Mine Clearance',
  BATTLE = 'Battle',
  BATTLE_VIBRO = 'Battle Vibro',
  HEAVY_BATTLE = 'Heavy Battle',
  HEAVY_BATTLE_VIBRO = 'Heavy Battle Vibro',
  CARGO_LIFTER = 'Cargo Lifter',
  INDUSTRIAL_DRILL = 'Industrial Drill',
  SALVAGE_ARM = 'Salvage Arm',
}
```

### Enum: BattleArmorLocation

```typescript
enum BattleArmorLocation {
  SQUAD = 'Squad',
  BODY = 'Body',
  LEFT_ARM = 'Left Arm',
  RIGHT_ARM = 'Right Arm',
  TURRET = 'Turret',
}
```

## Validation Rules

### Rule: VAL-PERS-001 - Squad Size Valid

- **Applies to**: Infantry, Battle Armor
- **Severity**: ERROR
- **Condition**: `squadSize` MUST be a positive integer
- **AND** for Battle Armor, the handler SHALL additionally enforce 1-6 range

### Rule: VAL-PERS-002 - Battle Armor Weight Range

- **Applies to**: Battle Armor only
- **Severity**: CRITICAL_ERROR
- **Condition**: Trooper weight MUST be between 0.4 and 2.0 tons
- **Fallback**: If `trooperWeight` is undefined, uses `weight` field

### Rule: BA Weight vs Weight Class Consistency

- **Applies to**: Battle Armor only
- **Severity**: WARNING
- **Condition**: `weightPerTrooper` SHOULD fall within the declared weight class thresholds
- **Thresholds**:
  - PA(L): 80-400 kg
  - Light: 401-750 kg
  - Medium: 751-1000 kg
  - Heavy: 1001-1500 kg
  - Assault: 1501-2000 kg

### Rule: Armor Per Trooper Maximum

- **Applies to**: Battle Armor only
- **Severity**: ERROR
- **Condition**: `armorPerTrooper` MUST NOT exceed the maximum for the weight class

### Rule: Assault BA Capability Constraints

- **Applies to**: Assault weight class Battle Armor
- **Severity**: ERROR
- **Condition**: `canSwarm` MUST be `false` AND `canMountOmni` MUST be `false`

## Store Architecture

### Store Factory Pattern

The Battle Armor store SHALL use the same factory pattern as other unit types:

- `createBattleArmorStore(initialState)` - Creates a Zustand store with persist middleware
- `createNewBattleArmorStore(options)` - Creates with default state from options
- Storage key: `megamek-battlearmor-{id}`
- `skipHydration: true` for SSR safety
- `partialize` SHALL serialize all state fields (not actions)

### Store Registry

The registry SHALL manage active BA store instances:

- `getBattleArmorStore(id)` - Retrieve store by ID
- `hydrateOrCreateBattleArmor(id, fallback)` - Load from localStorage or create new
- `createAndRegisterBattleArmor(options)` - Create and register in one step
- `duplicateBattleArmor(sourceId, newName?)` - Deep copy with new ID
- `deleteBattleArmor(id)` - Remove from registry and localStorage
- `clearAllBattleArmorStores(clearStorage?)` - Full cleanup
- Invalid UUIDs SHALL be replaced with generated valid UUIDs (with warning log)

### Store Actions

Actions SHALL set the relevant fields plus `isModified: true` and `lastModifiedAt: Date.now()`:

- **Identity**: setName, setChassis (also updates `name`), setModel (also updates `name`), setMulId, setYear, setRulesLevel
- **Classification**: setTechBase, setChassisType, setWeightClass, setWeightPerTrooper (clamped >= 0)
- **Squad**: setSquadSize (clamped 1-6), setMotionType, setGroundMP (>= 0), setJumpMP (>= 0), setMechanicalJumpBoosters, setUmuMP (>= 0)
- **Manipulators**: setLeftManipulator, setRightManipulator
- **Armor**: setArmorType, setArmorPerTrooper (>= 0)
- **Mounts**: setAPMount, setModularMount, setTurretMount
- **Special Systems**: setStealthSystem (clears stealthType when disabled), setMimeticArmor, setFireResistantArmor
- **Equipment**: addEquipment (returns instance ID), removeEquipment, updateEquipmentLocation, setEquipmentAPMount, setEquipmentTurretMount, setEquipmentModular, clearAllEquipment
- **Metadata**: markModified

### React Context

- `BattleArmorStoreContext` provides the active store
- `useBattleArmorStore(selector)` hook with mandatory context check
- `useBattleArmorStoreApi()` returns full store API

## Customizer UI

### Tab Layout

The customizer SHALL provide a two-tab interface:

#### Tab: Structure & Chassis

- **Identity Section**: Chassis name (text input), Model/Variant (text input), Tech Base (select: IS/Clan)
- **Chassis Configuration Section**: Chassis Type (select: Biped/Quad), Weight Class (select: all 5), Weight/Trooper in kg (number input, min 400, max 2000, step 50)
- **Movement Section**: Motion Type (select: Foot/Jump/VTOL/UMU), Ground MP (number, 0-5), Jump MP (number, 0-5)
- **Manipulators Section**: Left Manipulator (select: all 11 types), Right Manipulator (select: all 11 types)

#### Tab: Squad & Equipment

- **Squad Configuration Section**: Squad Size (number, 1-6), Armor/Trooper (number, 0-14), total squad armor display
- **Mount Options Section**: Anti-Personnel Mount (checkbox), Modular Mount (checkbox), Turret Mount (checkbox)
- **Equipment Browser**: Integrated `EquipmentBrowser` component for adding equipment
- **Mounted Equipment List**: Shows each mounted item with location selector (5 locations) and remove button, "Clear All" button when equipment exists

### Diagram Sidebar

The diagram sidebar SHALL display on large screens (lg breakpoint):

- Chassis type label
- Trooper grid (3-column) with trooper icons and armor points per trooper
- Stats summary: squad size, total armor (squadSize \* armorPerTrooper)

### Read-Only Mode

- **WHEN** `readOnly` is `true`
- **THEN** all inputs SHALL be disabled
- **AND** remove/clear buttons SHALL be hidden

### Store Context Integration

The `BattleArmorCustomizer` component SHALL:

- Accept a `store: StoreApi<BattleArmorStore>` prop
- Wrap children in `BattleArmorStoreContext.Provider`
- Support `initialTab` and `onTabChange` callback

## Handler Architecture

### BattleArmorUnitHandler

The handler SHALL extend `AbstractUnitTypeHandler<IBattleArmor>`:

- `unitType`: `UnitType.BATTLE_ARMOR`
- `displayName`: `"Battle Armor"`
- `getLocations()`: Returns all 5 `BattleArmorLocation` values
- `canHandle(doc)`: Returns `true` when `mappedUnitType === BATTLE_ARMOR`

### Parsing Pipeline

1. `parseCommonFields(doc)` - Extracts name, model, year, tonnage, tech base (from parent)
2. `parseTypeSpecificFields(doc)` - Extracts all BA-specific fields
3. `combineFields(common, specific)` - Merges into final `IBattleArmor`

### Boolean Tag Parsing

- Raw tags are parsed as booleans: `"true"` or `"1"` -> `true`, anything else -> `false`
- Array values use the first element

## Dependencies

- **PersonnelInterfaces** (`src/types/unit/PersonnelInterfaces.ts`): Shared with Infantry and ProtoMech - defines `IBattleArmor`, `IBattleArmorMountedEquipment`, enums
- **BaseUnitInterfaces** (`src/types/unit/BaseUnitInterfaces.ts`): `ISquadUnit`, `SquadMotionType`, `ISquadMovement`
- **UnitLocation** (`src/types/construction/UnitLocation.ts`): `BattleArmorLocation` enum
- **PersonnelCategoryRules** (`src/services/validation/rules/personnel/`): Shared validation rules (VAL-PERS-001 through VAL-PERS-003)
- **AbstractUnitTypeHandler**: Base handler class for BLK parsing/serialization
- **createStoreRegistry / clientSafeStorage**: Shared store infrastructure

## Implementation Files

| File                                                                | Purpose                               | Lines |
| ------------------------------------------------------------------- | ------------------------------------- | ----- |
| `src/types/unit/PersonnelInterfaces.ts`                             | IBattleArmor, enums, type guards      | ~410  |
| `src/stores/battleArmorState.ts`                                    | State interface, defaults, factory    | ~345  |
| `src/stores/useBattleArmorStore.ts`                                 | Zustand store factory, context, hooks | ~435  |
| `src/stores/battleArmorStoreRegistry.ts`                            | Registry for active store instances   | ~224  |
| `src/services/units/handlers/BattleArmorUnitHandler.ts`             | BLK parsing, validation, calculations | ~547  |
| `src/components/customizer/battlearmor/BattleArmorCustomizer.tsx`   | Main customizer with tabs             | ~160  |
| `src/components/customizer/battlearmor/BattleArmorStructureTab.tsx` | Structure/chassis tab UI              | ~288  |
| `src/components/customizer/battlearmor/BattleArmorSquadTab.tsx`     | Squad/equipment tab UI                | ~245  |
| `src/components/customizer/battlearmor/BattleArmorDiagram.tsx`      | Squad visual diagram                  | ~84   |
| `src/services/validation/rules/personnel/PersonnelCategoryRules.ts` | Shared validation rules               | ~203  |

## Known Limitations

- PA(L) weight class code `0` is treated as falsy by the BLK parser's `||` operator, defaulting to Medium; a `??` operator would be more correct
- Deserialization from standard format is not yet implemented (returns failure)
- BV calculation is simplified (armor-based only, no equipment BV contribution)
- Cost calculation uses fixed base costs per weight class without equipment cost additions
