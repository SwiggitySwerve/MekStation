# BattleTech Construction Rules Implementation Map

This document maps official BattleTech construction rules to their implementation in this codebase. It serves as a Single Source of Truth (SSoT) reference for understanding where rules are codified and how they work.

## Table of Contents

1. [Structure Points per Tonnage](#structure-points-per-tonnage)
2. [Armor Points per Structure Points](#armor-points-per-structure-points)
3. [Armor Points per Ton](#armor-points-per-ton)
4. [Implementation Details](#implementation-details)

---

## Structure Points per Tonnage

### Rule
Internal structure points are allocated to each location based on mech tonnage using an official BattleTech construction table. The allocation follows these principles:
- **Head**: Always 3 points regardless of tonnage
- **Other locations**: Scale with tonnage using formulas that round up fractional values
  - Center Torso: ~3.2 × (tonnage ÷ 10)
  - Left/Right Torso: ~2.1 × (tonnage ÷ 10) each
  - Left/Right Arm: ~1.7 × (tonnage ÷ 10) each
  - Left/Right Leg: ~2.1 × (tonnage ÷ 10) each

### Implementation Location
**File**: `utils/internalStructureTable.ts`

**Key Components**:
- `INTERNAL_STRUCTURE_TABLE`: Hardcoded lookup table mapping tonnage (20-100 tons, in 5-ton increments) to structure points per location
- `getInternalStructurePoints(tonnage)`: Returns structure points for all locations for a given tonnage
- `getTotalInternalStructure(tonnage)`: Returns sum of all structure points

**Example Usage**:
```typescript
import { getInternalStructurePoints } from './utils/internalStructureTable';

const structure = getInternalStructurePoints(50);
// Returns: { HD: 3, CT: 16, LT: 11, RT: 11, LA: 9, RA: 9, LL: 11, RL: 11 }
```

**Important Notes**:
- Structure points are **NOT** calculated as a simple multiplier of mech tonnage
- The table uses exact values from official BattleTech construction tables
- All structure types (Standard, Endo Steel, etc.) use the same structure point values - only weight differs

---

## Armor Points per Structure Points

### Rule
Maximum armor allocation follows the **2:1 rule**:
- **Standard Locations**: Maximum armor = 2 × internal structure points for that location
- **Head Exception**: Maximum armor = 9 points (regardless of structure points)

This rule applies to all armor types - armor type only affects weight efficiency, not maximum points.

### Implementation Location
**File**: `utils/internalStructureTable.ts`

**Key Functions**:
- `getMaxArmorPoints(tonnage)`: Returns total maximum armor points for entire mech
  - Calculates: `9 (head) + (sum of all other structure points) × 2`
- `getMaxArmorPointsForLocation(tonnage, location)`: Returns maximum armor for a specific location
  - Head: Always returns 9
  - Other locations: Returns `structure_points × 2`

**Example Usage**:
```typescript
import { getMaxArmorPoints, getMaxArmorPointsForLocation } from './utils/internalStructureTable';

const maxTotal = getMaxArmorPoints(50);
// Returns: 169 (9 + (16+11+11+9+9+11+11) × 2)

const maxCT = getMaxArmorPointsForLocation(50, 'CT');
// Returns: 32 (16 × 2)
```

**Important Notes**:
- The incorrect formula `tonnage × 2` does NOT account for the head cap and should not be used
- Structure type (Standard, Endo Steel, etc.) does NOT affect maximum armor points
- Armor type (Standard, Ferro-Fibrous, etc.) does NOT affect maximum armor points - only weight efficiency

---

## Armor Points per Ton

### Rule
Different armor types provide different numbers of armor points per ton of weight:
- **Standard**: 16 points/ton
- **Ferro-Fibrous**: 17.92 points/ton (12% more efficient)
- **Ferro-Fibrous (Clan)**: 17.92 points/ton (same efficiency, fewer critical slots)
- **Light Ferro-Fibrous**: 16.8 points/ton (5% more efficient)
- **Heavy Ferro-Fibrous**: 19.2 points/ton (20% more efficient)
- **Stealth**: 16 points/ton (same as standard, requires ECM)
- **Reactive**: 14 points/ton (less efficient, provides missile protection)
- **Reflective**: 16 points/ton (same as standard, provides energy protection)
- **Hardened**: 8 points/ton (50% less efficient, provides double protection)

### Implementation Location
**File**: `constants/BattleTechConstructionRules.ts`

**Key Constant**:
- `ARMOR_POINTS_PER_TON`: Object mapping armor type names to points per ton values

**Additional Locations**:
- `utils/armorCalculations.ts`: Contains `ARMOR_SPECIFICATIONS` with detailed armor type information
- `utils/armorTypes.ts`: Contains `ARMOR_TYPES` array with full armor type definitions

**Example Usage**:
```typescript
import { ARMOR_POINTS_PER_TON } from './constants/BattleTechConstructionRules';

const standardEfficiency = ARMOR_POINTS_PER_TON['Standard']; // 16
const ferroEfficiency = ARMOR_POINTS_PER_TON['Ferro-Fibrous']; // 17.92

// Calculate armor weight from points
const armorWeight = armorPoints / ARMOR_POINTS_PER_TON['Standard']; // Standard armor
```

**Important Notes**:
- Armor efficiency affects weight, not maximum armor points
- Maximum armor points are still limited by the 2:1 structure rule
- Critical slot requirements vary by armor type (see `ARMOR_CRITICAL_SLOTS` in `BattleTechConstructionRules.ts`)

---

## Implementation Details

### Structure Weight Calculation

**Rule**: Structure weight = 10% of mech tonnage (Standard) or 5% (Endo Steel)

**Implementation**: `utils/structureCalculations.ts`
- `calculateStructureWeight(mechTonnage, type)`: Calculates structure weight based on type
- Uses `STRUCTURE_WEIGHT_MULTIPLIERS` constant

**Important**: Structure weight and structure points are different concepts:
- **Structure Points**: Determined by tonnage table (same for all structure types)
- **Structure Weight**: Determined by structure type multiplier (varies by type)

### Armor Weight Calculation

**Rule**: Armor weight = armor points ÷ armor efficiency

**Implementation**: `utils/armorCalculations.ts` and `utils/armorTypes.ts`
- `calculateArmorWeight(armorPoints, armorType)`: Calculates weight from points
- Uses `pointsPerTon` property from armor type definition

### Maximum Armor Calculation Flow

1. **Get Structure Points**: Use `getInternalStructurePoints(tonnage)` from `internalStructureTable.ts`
2. **Calculate Max Armor**: Use `getMaxArmorPoints(tonnage)` which applies 2:1 rule
3. **Calculate Weight**: Use `calculateArmorWeight(maxPoints, armorType)` based on armor efficiency

### Common Mistakes to Avoid

1. **DO NOT** use `tonnage × 2` for maximum armor - this ignores the head cap
2. **DO NOT** assume structure points = `tonnage × 0.1` - use the official table
3. **DO NOT** assume structure type affects maximum armor points - it only affects weight
4. **DO NOT** assume armor type affects maximum armor points - it only affects weight efficiency

### Code References

**Authoritative Functions** (use these):
- `utils/internalStructureTable.ts`:
  - `getInternalStructurePoints(tonnage)` - Structure points by location
  - `getMaxArmorPoints(tonnage)` - Maximum total armor
  - `getMaxArmorPointsForLocation(tonnage, location)` - Maximum armor per location

**Supporting Functions**:
- `utils/armorCalculations.ts`:
  - `calculateMaxArmorPoints(tonnage)` - Wrapper around `getMaxArmorPoints`
  - `calculateArmorWeight(armorPoints, armorType)` - Weight from points
  - `calculateArmorPoints(armorWeight, armorType)` - Points from weight

**Constants**:
- `constants/BattleTechConstructionRules.ts`:
  - `ARMOR_POINTS_PER_TON` - Armor efficiency values
  - `ARMOR_CRITICAL_SLOTS` - Critical slot requirements
  - `STRUCTURE_WEIGHT_MULTIPLIER` - Structure weight multipliers

---

## Summary

| Rule | Implementation File | Key Function/Constant |
|------|-------------------|----------------------|
| Structure Points per Tonnage | `utils/internalStructureTable.ts` | `INTERNAL_STRUCTURE_TABLE`, `getInternalStructurePoints()` |
| Armor Points per Structure (2:1 rule) | `utils/internalStructureTable.ts` | `getMaxArmorPoints()`, `getMaxArmorPointsForLocation()` |
| Armor Points per Ton | `constants/BattleTechConstructionRules.ts` | `ARMOR_POINTS_PER_TON` |
| Structure Weight | `utils/structureCalculations.ts` | `calculateStructureWeight()` |
| Armor Weight | `utils/armorCalculations.ts` | `calculateArmorWeight()` |

**Single Source of Truth**: `utils/internalStructureTable.ts` is the authoritative source for structure points and maximum armor calculations. All other files should reference these functions rather than implementing their own calculations.

