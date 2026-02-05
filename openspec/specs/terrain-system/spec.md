# Terrain System Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-01-31
**Dependencies**: [hex-grid-interfaces, movement-system]
**Affects**: [tactical-map-interface, combat-resolution, movement-validation]

---

## Overview

### Purpose

Defines the terrain type system for BattleTech tactical combat, including movement costs, combat modifiers, heat effects, and line-of-sight blocking. This specification encodes TechManual terrain rules as machine-readable data.

### Scope

**In Scope:**

- Terrain type enumeration with mechanical properties
- Movement cost calculation per terrain and unit movement type
- To-hit modifiers (intervening and target-in-terrain)
- Heat effects (water cooling, environmental modifiers)
- Line-of-sight blocking rules
- Terrain feature stacking (multiple features per hex)

**Out of Scope:**

- Visual rendering (see tactical-map-interface)
- Tactical Operations advanced terrain (magma, ultra-heavy woods)
- Weather effects
- Terrain transformation (fire spreading, building collapse)

### Key Concepts

- **Terrain Type**: An enumerated type representing a terrain category (woods, water, building, etc.)
- **Terrain Level**: A numeric modifier indicating intensity/depth (water depth 1 vs 2, light vs heavy woods)
- **Terrain Feature**: A specific terrain instance with type and level
- **Movement Type**: How a unit moves (walk, run, jump, tracked, wheeled, hover, VTOL)
- **LOS Blocking**: Whether terrain prevents line-of-sight at given elevation

---

## Requirements

### Requirement: Terrain Type Enumeration

The system SHALL define an enumeration of terrain types matching TechManual categories.

**Priority**: Critical

#### Scenario: All TechManual terrain types present

**GIVEN** the TerrainType enumeration
**WHEN** listing all terrain types
**THEN** the following types SHALL be included:

- Clear, Pavement, Road
- LightWoods, HeavyWoods
- Rough, Rubble
- Water (with depth levels 0-3+)
- Building (with CF levels)
- Sand, Mud, Snow, Ice, Swamp
- Bridge
- Fire, Smoke

---

### Requirement: Movement Cost by Terrain

The system SHALL calculate movement point cost based on terrain type, terrain level, and unit movement type.

**Rationale**: TechManual specifies different MP costs per terrain per movement mode.

**Priority**: Critical

#### Scenario: Clear terrain base cost

**GIVEN** a hex with terrain type Clear
**WHEN** calculating movement cost for any movement type
**THEN** the cost SHALL be 1 MP

#### Scenario: Light Woods walking cost

**GIVEN** a hex with terrain type LightWoods (level 1)
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 2 MP (1 base + 1 woods)

#### Scenario: Heavy Woods walking cost

**GIVEN** a hex with terrain type HeavyWoods (level 2)
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 3 MP (1 base + 2 woods)

#### Scenario: Jump ignores terrain

**GIVEN** a hex with terrain type HeavyWoods
**WHEN** calculating movement cost for Jump movement
**THEN** the cost SHALL be 1 MP (jumping ignores ground terrain)

#### Scenario: Water depth 1 walking

**GIVEN** a hex with terrain type Water at depth 1
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 2 MP (1 base + 1 water)
**AND** a Piloting Skill Roll (PSR) SHALL be required

#### Scenario: Water depth 2 walking

**GIVEN** a hex with terrain type Water at depth 2
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 4 MP (1 base + 3 water)
**AND** Running SHALL be prohibited

#### Scenario: Water depth 3+ impassable for walking

**GIVEN** a hex with terrain type Water at depth 3 or greater
**WHEN** calculating movement cost for Walk movement
**THEN** the movement SHALL be marked as impassable
**AND** only Jump movement SHALL be allowed

#### Scenario: Rough terrain cost

**GIVEN** a hex with terrain type Rough
**WHEN** calculating movement cost for Walk movement
**THEN** the cost SHALL be 2 MP (1 base + 1 rough)

#### Scenario: Wheeled vehicles on sand

**GIVEN** a hex with terrain type Sand
**WHEN** calculating movement cost for Wheeled movement
**THEN** the cost SHALL be 3 MP (1 base + 2 sand penalty for wheeled)

---

### Requirement: To-Hit Modifiers

The system SHALL calculate to-hit modifiers based on terrain between attacker and target, and terrain the target occupies.

**Priority**: Critical

#### Scenario: Intervening light woods

**GIVEN** an attack where the line of fire passes through light woods hexes
**WHEN** calculating the to-hit modifier
**THEN** each light woods hex SHALL add +1 to the target number

#### Scenario: Intervening heavy woods

**GIVEN** an attack where the line of fire passes through heavy woods hexes
**WHEN** calculating the to-hit modifier
**THEN** each heavy woods hex SHALL add +2 to the target number

#### Scenario: Target in light woods

**GIVEN** a target standing in a light woods hex
**WHEN** calculating the to-hit modifier for attacks against that target
**THEN** +1 SHALL be added to the target number

#### Scenario: Target in heavy woods

**GIVEN** a target standing in a heavy woods hex
**WHEN** calculating the to-hit modifier for attacks against that target
**THEN** +2 SHALL be added to the target number

#### Scenario: Target in water depth 1

**GIVEN** a target standing in water at depth 1
**WHEN** calculating the to-hit modifier for attacks against that target
**THEN** -1 SHALL be applied (easier to hit due to restricted movement)

#### Scenario: Light smoke intervening

**GIVEN** an attack where the line of fire passes through light smoke
**WHEN** calculating the to-hit modifier
**THEN** each light smoke hex SHALL add +1 to the target number

#### Scenario: Heavy smoke intervening

**GIVEN** an attack where the line of fire passes through heavy smoke
**WHEN** calculating the to-hit modifier
**THEN** each heavy smoke hex SHALL add +2 to the target number

---

### Requirement: Cover Levels

The system SHALL classify terrain into cover levels for partial/full cover determination.

**Priority**: High

#### Scenario: No cover in clear terrain

**GIVEN** a unit in Clear terrain
**WHEN** determining cover level
**THEN** cover SHALL be NONE

#### Scenario: Partial cover in light woods

**GIVEN** a unit in LightWoods terrain
**WHEN** determining cover level
**THEN** cover SHALL be PARTIAL

#### Scenario: Full cover in heavy woods

**GIVEN** a unit in HeavyWoods terrain
**WHEN** determining cover level
**THEN** cover SHALL be FULL

#### Scenario: Partial cover in water depth 1

**GIVEN** a unit standing in Water at depth 1
**WHEN** determining cover level
**THEN** cover SHALL be PARTIAL (hull down position allowed)

---

### Requirement: Heat Effects

The system SHALL calculate heat modifiers based on terrain, particularly water cooling.

**Priority**: High

#### Scenario: Water depth 1 cooling

**GIVEN** a BattleMech standing in Water at depth 1
**WHEN** calculating heat dissipation for the Heat Phase
**THEN** heat sink capacity SHALL be increased by 2

#### Scenario: Water depth 2+ cooling

**GIVEN** a BattleMech standing in Water at depth 2 or greater
**WHEN** calculating heat dissipation for the Heat Phase
**THEN** heat sink capacity SHALL be increased by 4

#### Scenario: Fire hex heat

**GIVEN** a BattleMech standing in a Fire hex
**WHEN** calculating heat accumulation for the Heat Phase
**THEN** 5 heat points SHALL be added

---

### Requirement: Line of Sight Blocking

The system SHALL determine if terrain blocks line of sight based on terrain type, level, and elevation differences.

**Priority**: High

#### Scenario: Heavy woods blocks LOS

**GIVEN** an attack where the line of fire passes through a HeavyWoods hex
**WHEN** checking line of sight
**THEN** LOS SHALL be blocked
**UNLESS** the attacker or target is at a higher elevation that sees over the woods

#### Scenario: Building blocks LOS

**GIVEN** an attack where the line of fire passes through a Building hex
**WHEN** checking line of sight
**THEN** LOS SHALL be blocked based on building height vs unit elevations

#### Scenario: Elevation allows seeing over

**GIVEN** an attacker at elevation 3, target at elevation 0, with level 2 woods in between
**WHEN** checking line of sight
**THEN** LOS SHALL NOT be blocked (attacker can see over the woods)

#### Scenario: Light woods does not block

**GIVEN** an attack where the line of fire passes through LightWoods hexes
**WHEN** checking line of sight
**THEN** LOS SHALL NOT be blocked (light woods provides concealment, not blocking)

---

### Requirement: Terrain Feature Stacking

The system SHALL support multiple terrain features per hex (e.g., road through woods).

**Priority**: Medium

#### Scenario: Road through woods

**GIVEN** a hex with both Road and LightWoods features
**WHEN** calculating movement cost using the road
**THEN** the road cost SHALL apply (0 additional MP)
**BUT** to-hit modifiers for woods SHALL still apply

#### Scenario: Water under ice

**GIVEN** a hex with both Water and Ice features
**WHEN** determining terrain effects
**THEN** the Ice SHALL be the primary terrain for movement
**AND** ice breaking rules SHALL apply based on unit weight

#### Scenario: Building with basement

**GIVEN** a hex with a Building feature at elevation 2 and basement at depth 1
**WHEN** determining terrain properties
**THEN** both above-ground and below-ground features SHALL be tracked

---

### Requirement: Elevation Change Cost

The system SHALL add movement cost for elevation changes.

**Priority**: High

#### Scenario: One level elevation change

**GIVEN** movement from elevation 0 to elevation 1
**WHEN** calculating movement cost
**THEN** +1 MP SHALL be added for the elevation change

#### Scenario: Two level elevation change

**GIVEN** movement from elevation 0 to elevation 2
**WHEN** calculating movement cost
**THEN** +2 MP SHALL be added for the elevation change

#### Scenario: Three+ level elevation prohibited

**GIVEN** movement from elevation 0 to elevation 3
**WHEN** determining if movement is valid for Walk/Run
**THEN** the movement SHALL be prohibited (must use Jump)

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Enumeration of all terrain types per TechManual.
 */
enum TerrainType {
  Clear = 'clear',
  Pavement = 'pavement',
  Road = 'road',
  LightWoods = 'light_woods',
  HeavyWoods = 'heavy_woods',
  Rough = 'rough',
  Rubble = 'rubble',
  Water = 'water',
  Sand = 'sand',
  Mud = 'mud',
  Snow = 'snow',
  Ice = 'ice',
  Swamp = 'swamp',
  Building = 'building',
  Bridge = 'bridge',
  Fire = 'fire',
  Smoke = 'smoke',
}

/**
 * Cover level classification.
 */
enum CoverLevel {
  None = 'none',
  Partial = 'partial',
  Full = 'full',
}

/**
 * A terrain feature with type and level.
 */
interface ITerrainFeature {
  /** The terrain type */
  readonly type: TerrainType;

  /** Level/depth/intensity (0 = none, 1+ = increasing) */
  readonly level: number;

  /** For buildings: Construction Factor */
  readonly constructionFactor?: number;

  /** Whether this terrain is currently on fire */
  readonly isOnFire?: boolean;

  /** Whether water/ice is frozen */
  readonly isFrozen?: boolean;
}

/**
 * Mechanical properties for a terrain type.
 */
interface ITerrainProperties {
  /** Base movement cost modifier (added to 1) */
  readonly movementCostModifier: {
    walk: number;
    run: number;
    jump: number;
    tracked: number;
    wheeled: number;
    hover: number;
    vtol: number;
  };

  /** To-hit modifier when intervening */
  readonly toHitInterveningModifier: number;

  /** To-hit modifier when target is in this terrain */
  readonly toHitTargetInModifier: number;

  /** Heat effect per turn (negative = cooling) */
  readonly heatEffect: number;

  /** Cover level provided */
  readonly coverLevel: CoverLevel;

  /** Whether this terrain blocks LOS */
  readonly blocksLOS: boolean;

  /** Height for LOS calculations (0 = ground level) */
  readonly losBlockHeight: number;

  /** Whether PSR is required to enter */
  readonly requiresPSR: boolean;

  /** Special rules that apply */
  readonly specialRules: readonly string[];
}

/**
 * Complete hex terrain definition.
 */
interface IHexTerrain {
  /** Hex coordinate */
  readonly coordinate: IHexCoordinate;

  /** Base elevation level */
  readonly elevation: number;

  /** All terrain features in this hex */
  readonly features: readonly ITerrainFeature[];
}
```

### Required Properties

| Property             | Type          | Required      | Description      | Valid Values     | Default |
| -------------------- | ------------- | ------------- | ---------------- | ---------------- | ------- |
| `type`               | `TerrainType` | Yes           | Terrain category | Enum values      | -       |
| `level`              | `number`      | Yes           | Intensity/depth  | >= 0             | 0       |
| `elevation`          | `number`      | Yes           | Hex elevation    | -5 to 10 typical | 0       |
| `constructionFactor` | `number`      | For Buildings | Building CF      | 1-120+           | -       |

---

## Calculation Formulas

### Movement Cost Formula

**Formula**:

```
totalCost = baseCost + terrainModifier + elevationChange
```

**Where**:

- `baseCost` = 1 (all terrain)
- `terrainModifier` = lookup from TERRAIN_PROPERTIES[type][movementType]
- `elevationChange` = abs(targetElevation - sourceElevation)

**Example**:

```
Walking into Heavy Woods at +1 elevation:
  baseCost = 1
  terrainModifier = 2 (heavy woods)
  elevationChange = 1
  totalCost = 1 + 2 + 1 = 4 MP
```

### To-Hit Modifier Formula

**Formula**:

```
totalModifier = sumInterveningModifiers + targetTerrainModifier
```

**Where**:

- `sumInterveningModifiers` = sum of toHitInterveningModifier for each hex in LOS
- `targetTerrainModifier` = toHitTargetInModifier for target hex

---

## Terrain Properties Table

| Terrain           | Walk Cost | To-Hit Intervening | To-Hit Target In | Heat | Cover   | Blocks LOS |
| ----------------- | --------- | ------------------ | ---------------- | ---- | ------- | ---------- |
| Clear             | +0        | +0                 | +0               | 0    | None    | No         |
| Pavement          | +0        | +0                 | +0               | 0    | None    | No         |
| Road              | +0        | +0                 | +0               | 0    | None    | No         |
| LightWoods        | +1        | +1                 | +1               | 0    | Partial | No         |
| HeavyWoods        | +2        | +2                 | +2               | 0    | Full    | Yes        |
| Rough             | +1        | +0                 | +0               | 0    | None    | No         |
| Rubble            | +1        | +0                 | +0               | 0    | None    | No         |
| Water D1          | +1        | +0                 | -1               | -2   | Partial | No         |
| Water D2          | +3        | +0                 | +1               | -4   | Partial | No         |
| Water D3+         | N/A       | +0                 | N/A              | N/A  | N/A     | No         |
| Sand              | +1        | +0                 | +0               | 0    | None    | No         |
| Mud               | +1        | +0                 | +0               | 0    | None    | No         |
| Snow (thin)       | +0        | +0                 | +0               | 0    | None    | No         |
| Snow (deep)       | +1        | +0                 | +0               | 0    | None    | No         |
| Ice               | +0        | +0                 | +0               | 0    | None    | No         |
| Swamp             | +2        | +0                 | +1               | 0    | Partial | No         |
| Building (light)  | +1        | +1                 | +1               | 0    | Partial | Yes        |
| Building (medium) | +2        | +2                 | +2               | 0    | Full    | Yes        |
| Building (heavy)  | +3        | +3                 | +3               | 0    | Full    | Yes        |
| Fire              | +0        | +0                 | +0               | +5   | None    | No         |
| Smoke (light)     | +0        | +1                 | +1               | 0    | Partial | No         |
| Smoke (heavy)     | +0        | +2                 | +2               | 0    | Full    | Yes        |

---

## Validation Rules

### Validation: Valid Terrain Level

**Rule**: Terrain level MUST be appropriate for terrain type.
**Severity**: Error

**Condition**:

```typescript
if (type === TerrainType.Water && (level < 0 || level > 10)) {
  // invalid
}
if (type === TerrainType.LightWoods && level !== 1) {
  // invalid - light woods is always level 1
}
```

**Error Message**: "Invalid terrain level {level} for terrain type {type}"

### Validation: Stacking Compatibility

**Rule**: Certain terrain features cannot coexist.
**Severity**: Error

**Condition**:

```typescript
if (hasFeature(TerrainType.Fire) && hasFeature(TerrainType.Water)) {
  // invalid - fire cannot exist in water
}
```

**Error Message**: "Incompatible terrain features: {feature1} and {feature2}"

---

## Dependencies

### Depends On

- **hex-grid-interfaces**: IHexCoordinate for hex positions
- **movement-system**: MovementType enumeration

### Used By

- **tactical-map-interface**: Renders terrain visually
- **combat-resolution**: Uses to-hit modifiers
- **movement-validation**: Uses movement costs
- **heat-management**: Uses heat effects

---

## Implementation Notes

### Performance Considerations

- Pre-calculate and cache terrain properties at map load time
- Use lookup tables rather than conditionals for property access

### Edge Cases

- Stacked terrain (road + woods): Use most restrictive for movement, cumulative for modifiers
- Partial hexes at map edge: Treat as impassable
- Underwater combat: Most weapons cannot fire

---

## References

### Official BattleTech Rules

- **TechManual**: Pages 25-35 - Terrain Effects
- **Total Warfare**: Pages 58-72 - Terrain Rules
- **Tactical Operations**: Pages 55-68 - Advanced Terrain

---

## Changelog

### Version 1.0 (2025-01-31)

- Initial specification based on TechManual terrain rules
- Covers core terrain types, movement costs, combat modifiers, heat effects
