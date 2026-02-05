# Equipment Compatibility Constraints Analysis

## Overview

This document analyzes the gaps in MekStation's equipment system that prevent proper multi-unit-type support. It compares our current implementation against MegaMek's equipment flag system.

## Reference Locations

| Resource     | Path                     | Notes                         |
| ------------ | ------------------------ | ----------------------------- |
| MegaMek Core | `E:\Projects\megamek`    | github.com/MegaMek/megamek    |
| MegaMekLab   | `E:\Projects\megameklab` | github.com/MegaMek/megameklab |
| mm-data      | `E:\Projects\mm-data`    | github.com/MegaMek/mm-data    |

---

## MegaMek Equipment Flag System

### Unit Type Flags for Misc Equipment (MiscTypeFlag.java)

```java
// Lines 56-61, 174, 272, 291-295
F_BA_EQUIPMENT           // Battle Armor only
F_MEK_EQUIPMENT          // BattleMechs (and IndustrialMechs)
F_TANK_EQUIPMENT         // Ground vehicles (Combat Vehicles)
F_FIGHTER_EQUIPMENT      // Aerospace fighters
F_SUPPORT_TANK_EQUIPMENT // Support vehicles
F_PROTOMEK_EQUIPMENT     // ProtoMechs
F_VTOL_EQUIPMENT         // VTOLs specifically
F_INF_EQUIPMENT          // Infantry
F_SC_EQUIPMENT           // Small Craft
F_DS_EQUIPMENT           // DropShips
F_JS_EQUIPMENT           // JumpShips
F_WS_EQUIPMENT           // WarShips
F_SS_EQUIPMENT           // Space Stations
```

### Unit Type Flags for Weapons (WeaponTypeFlag.java)

```java
// Lines 118-125
F_AERO_WEAPON    // Aerospace units
F_INFANTRY       // Infantry weapons (damage by # men)
F_BA_WEAPON      // Battle Armor weapons
F_MEK_WEAPON     // BattleMech weapons
F_PROTO_WEAPON   // ProtoMech weapons
F_TANK_WEAPON    // Vehicle/Tank weapons
```

### Flag Usage Pattern

Equipment in MegaMek uses bitwise OR to combine flags:

```java
// Example: MASC can mount on Mechs AND Tanks AND Support Vehicles
misc.flags = misc.flags
    .or(F_MASC)
    .or(F_MEK_EQUIPMENT)
    .or(F_TANK_EQUIPMENT)
    .or(F_SUPPORT_TANK_EQUIPMENT);

// Example: Jump Jets are Mech-only
misc.flags = misc.flags
    .or(F_JUMP_JET)
    .or(F_MEK_EQUIPMENT);

// Example: Vehicle Jump Jets are Tank/Support-only
misc.flags = misc.flags
    .or(F_JUMP_JET)
    .or(F_TANK_EQUIPMENT)
    .or(F_SUPPORT_TANK_EQUIPMENT);
```

---

## Current MekStation Equipment System

### Equipment Interfaces (src/types/equipment/)

**IWeapon** fields:

- id, name, category, subType, techBase, rulesLevel
- damage, heat, ranges, weight, criticalSlots
- ammoPerTon, costCBills, battleValue, introductionYear
- isExplosive, special[]

**IAmmunition** fields:

- id, name, category, variant, techBase, rulesLevel
- compatibleWeaponIds[], shotsPerTon, weight, criticalSlots
- costPerTon, battleValue, isExplosive, introductionYear
- damageModifier, rangeModifier, special[]

**IElectronics** fields:

- id, name, category, techBase, rulesLevel
- weight, criticalSlots, costCBills, battleValue
- introductionYear, special[], variableEquipmentId

**IMiscEquipment** fields:

- id, name, category, techBase, rulesLevel
- weight, criticalSlots, costCBills, battleValue
- introductionYear, special[], variableEquipmentId

### Equipment Filter (IEquipmentFilter)

```typescript
interface IEquipmentFilter {
  category?: string | string[];
  techBase?: TechBase | TechBase[];
  rulesLevel?: RulesLevel | RulesLevel[];
  maxYear?: number;
  minYear?: number;
  searchText?: string;
  // MISSING: unitType filter!
}
```

---

## Identified Gaps

### Gap 1: No Unit Type Compatibility Field

**Current State**: Equipment JSON has no field indicating which unit types can mount it.

**Impact**: Cannot filter equipment browser by current unit type.

**Solution**: Add `allowedUnitTypes: UnitType[]` to all equipment interfaces.

### Gap 2: No Equipment Filter by Unit Type

**Current State**: `IEquipmentFilter` lacks `unitType` field.

**Impact**: Equipment browser shows all equipment regardless of unit type.

**Solution**: Add `unitType?: UnitType | UnitType[]` to filter interface.

### Gap 3: Missing Unit-Type-Specific Equipment

**Current State**: Equipment database only has mech-compatible equipment.

**Missing Equipment Categories**:

| Category          | Examples                                | Unit Types   |
| ----------------- | --------------------------------------- | ------------ |
| BA Manipulators   | Basic, Battle Claw, Armored Glove       | Battle Armor |
| BA Weapons        | David Light Gauss, BA MG, Micro Grenade | Battle Armor |
| Infantry Weapons  | Rifles, Support Weapons, Archaic        | Infantry     |
| Vehicle Systems   | Turrets, Motive Systems, Flotation      | Vehicles     |
| VTOL Systems      | Rotors, VTOL Jet                        | VTOL         |
| Aerospace Systems | Fuel Tanks, Thrust Enhancement          | Aerospace    |
| Capital Systems   | Naval Weapons, Gravity Decks, K-F Drive | DropShips+   |
| ProtoMech Systems | Main Gun, Proto JJ                      | ProtoMech    |

### Gap 4: No Location Compatibility by Unit Type

**Current State**: Locations are mech-specific (HEAD, LEFT_ARM, etc.).

**Missing Location Sets**:

| Unit Type    | Locations                                  |
| ------------ | ------------------------------------------ |
| Vehicle      | FRONT, LEFT, RIGHT, REAR, TURRET, BODY     |
| VTOL         | FRONT, LEFT, RIGHT, REAR, ROTOR, BODY      |
| Aerospace    | NOSE, LEFT_WING, RIGHT_WING, AFT, FUSELAGE |
| Battle Armor | SQUAD, BODY, LEFT_ARM, RIGHT_ARM           |
| Infantry     | SQUAD (no equipment locations)             |
| DropShip+    | NOSE, FL_ARC, FR_ARC, AL_ARC, AR_ARC, AFT  |

### Gap 5: No Special Equipment Flags

**Current State**: `special[]` array exists but lacks standardized flags.

**Missing Flag Types**:

- Heat generation flags (F_HEAT_SINK, F_DOUBLE_HEAT_SINK)
- Defensive flags (F_CASE, F_CASE_II, F_STEALTH)
- Movement flags (F_JUMP_JET, F_MASC, F_TSM)
- Electronics flags (F_ECM, F_BAP, F_C3S)
- Targeting flags (F_ARTEMIS, F_TARGETING_COMPUTER)

### Gap 6: No Variable Equipment Support by Unit Type

**Current State**: Variable equipment (tonnage-based) assumes mech formulas.

**Missing Formulas**:

- Vehicle armor (different points-per-ton)
- Aerospace fuel (fuel points, not tons)
- Capital armor (different calculation entirely)
- Battle armor armor (per-trooper)

### Gap 7: No Equipment Mounting Rules by Unit Type

**Current State**: Mounting rules are mech-centric.

**Missing Rules**:

- Turret mounting restrictions (weight limits)
- Arc-based mounting (aerospace, capital ships)
- Squad-based mounting (battle armor)
- No mounting (infantry - equipment is inherent)

---

## Equipment Cross-Compatibility Matrix

Based on MegaMek flags, here's which equipment categories work with which units:

| Equipment          | Mech | Vehicle | VTOL | Aero | BA  | Infantry | Proto | Capital |
| ------------------ | :--: | :-----: | :--: | :--: | :-: | :------: | :---: | :-----: |
| Standard Weapons   |  ✓   |    ✓    |  ✓   |  ✓   |  -  |    -     |   ✓   |    -    |
| BA Weapons         |  -   |    -    |  -   |  -   |  ✓  |    -     |   -   |    -    |
| Infantry Weapons   |  -   |    -    |  -   |  -   |  -  |    ✓     |   -   |    -    |
| Capital Weapons    |  -   |    -    |  -   |  -   |  -  |    -     |   -   |    ✓    |
| Jump Jets          |  ✓   |   ✓\*   |  -   |  -   |  ✓  |    -     |   ✓   |    -    |
| MASC               |  ✓   |    ✓    |  -   |  -   |  ✓  |    -     |   ✓   |    -    |
| TSM                |  ✓   |    -    |  -   |  -   |  -  |    -     |   -   |    -    |
| Standard Armor     |  ✓   |    ✓    |  ✓   |  ✓   |  -  |    -     |   ✓   |    -    |
| BA Armor           |  -   |    -    |  -   |  -   |  ✓  |    -     |   -   |    -    |
| Capital Armor      |  -   |    -    |  -   |  -   |  -  |    -     |   -   |    ✓    |
| CASE               |  ✓   |    ✓    |  ✓   |  ✓   |  -  |    -     |   -   |    ✓    |
| ECM                |  ✓   |    ✓    |  ✓   |  ✓   |  ✓  |    -     |   -   |    -    |
| C3 Systems         |  ✓   |    ✓    |  ✓   |  ✓   |  ✓  |    -     |   -   |    -    |
| Targeting Computer |  ✓   |    ✓    |  ✓   |  ✓   |  -  |    -     |   -   |    -    |

\*Vehicle Jump Jets are a different equipment item from Mech Jump Jets

---

## Proposed Schema Changes

### Equipment Base Interface Addition

```typescript
interface IEquipmentBase {
  // Existing fields...

  // NEW: Unit type compatibility
  readonly allowedUnitTypes: UnitType[];

  // NEW: Standardized flags (replaces freeform special[])
  readonly flags: EquipmentFlag[];

  // NEW: Location restrictions (if any)
  readonly allowedLocations?: LocationType[];

  // NEW: Mounting constraints
  readonly mountingConstraints?: IMountingConstraints;
}

interface IMountingConstraints {
  readonly requiresTurret?: boolean;
  readonly splitableLocations?: boolean;
  readonly fixedLocation?: LocationType;
  readonly incompatibleWith?: string[]; // equipment IDs
  readonly requiresEquipment?: string[]; // equipment IDs
}
```

### Equipment Flag Enum

```typescript
enum EquipmentFlag {
  // Unit type flags (primary filter)
  MECH_EQUIPMENT = 'MECH_EQUIPMENT',
  VEHICLE_EQUIPMENT = 'VEHICLE_EQUIPMENT',
  VTOL_EQUIPMENT = 'VTOL_EQUIPMENT',
  AEROSPACE_EQUIPMENT = 'AEROSPACE_EQUIPMENT',
  BATTLE_ARMOR_EQUIPMENT = 'BA_EQUIPMENT',
  INFANTRY_EQUIPMENT = 'INF_EQUIPMENT',
  PROTOMECH_EQUIPMENT = 'PROTO_EQUIPMENT',
  SMALL_CRAFT_EQUIPMENT = 'SC_EQUIPMENT',
  DROPSHIP_EQUIPMENT = 'DS_EQUIPMENT',
  JUMPSHIP_EQUIPMENT = 'JS_EQUIPMENT',
  WARSHIP_EQUIPMENT = 'WS_EQUIPMENT',
  SPACE_STATION_EQUIPMENT = 'SS_EQUIPMENT',

  // Behavior flags
  HEAT_SINK = 'HEAT_SINK',
  DOUBLE_HEAT_SINK = 'DOUBLE_HEAT_SINK',
  JUMP_JET = 'JUMP_JET',
  MASC = 'MASC',
  TSM = 'TSM',
  CASE = 'CASE',
  CASE_II = 'CASE_II',
  ECM = 'ECM',
  BAP = 'BAP',
  C3_SYSTEM = 'C3_SYSTEM',
  TARGETING_COMPUTER = 'TARGETING_COMPUTER',
  ARTEMIS = 'ARTEMIS',
  EXPLOSIVE = 'EXPLOSIVE',
  SPREADABLE = 'SPREADABLE',
  VARIABLE_SIZE = 'VARIABLE_SIZE',
}
```

### Updated Equipment Filter

```typescript
interface IEquipmentFilter {
  // Existing fields...
  category?: string | string[];
  techBase?: TechBase | TechBase[];
  rulesLevel?: RulesLevel | RulesLevel[];
  maxYear?: number;
  minYear?: number;
  searchText?: string;

  // NEW: Unit type filter
  unitType?: UnitType | UnitType[];

  // NEW: Flag filter
  hasFlags?: EquipmentFlag[];
  excludeFlags?: EquipmentFlag[];

  // NEW: Location filter
  mountableAt?: LocationType[];
}
```

---

## Implementation Priority

### Phase 1: Core Schema (Blocking)

1. Add `allowedUnitTypes` to equipment interfaces
2. Add `EquipmentFlag` enum
3. Update equipment JSON schema
4. Add unitType to IEquipmentFilter

### Phase 2: Data Migration (Blocking)

1. Audit existing equipment for unit type compatibility
2. Add allowedUnitTypes to all existing equipment JSON
3. Convert special[] to flags[] where applicable

### Phase 3: New Equipment Categories

1. Add Battle Armor equipment
2. Add Vehicle-specific equipment
3. Add Aerospace-specific equipment
4. Add Infantry equipment
5. Add ProtoMech equipment
6. Add Capital ship equipment

### Phase 4: UI Integration

1. Filter equipment browser by active unit type
2. Show compatibility warnings
3. Prevent invalid equipment mounting

---

## Validation Rules to Add

### VAL-EQUIP-UNIT-001: Unit Type Compatibility

- **WHEN** mounting equipment on a unit
- **THEN** equipment.allowedUnitTypes MUST include unit.unitType
- **SEVERITY** Error

### VAL-EQUIP-UNIT-002: Location Compatibility

- **WHEN** mounting equipment at a location
- **THEN** location MUST be valid for unit type
- **SEVERITY** Error

### VAL-EQUIP-UNIT-003: Turret Mounting

- **WHEN** mounting equipment with requiresTurret=true
- **THEN** unit MUST have turret configured
- **SEVERITY** Error

### VAL-EQUIP-UNIT-004: Incompatible Equipment

- **WHEN** mounting equipment with incompatibleWith[]
- **THEN** unit MUST NOT have any listed equipment mounted
- **SEVERITY** Error
