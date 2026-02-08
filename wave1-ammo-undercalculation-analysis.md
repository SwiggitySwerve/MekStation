# Wave 1 Ammo Undercalculation Analysis

**Analysis Date**: 2026-02-06  
**Scope**: Top 5 undercalculation units (80 units, avg 9.9% error)  
**Hypothesis**: Ammo BV capping logic using modified weapon BV instead of base weapon BV

---

## Executive Summary

**CRITICAL FINDING**: The root cause of undercalculation in 4 of the 5 units is **NOT ammo capping logic**, but rather **missing weapon definitions in the unit JSON files**. These units have no weapons in their `equipment` array, resulting in zero weapon BV and zero ammo BV.

Only **Koshi Z** has weapons defined and shows ammo BV calculation. The ammo capping logic itself appears correct - it uses base weapon BV from the `config.weapons` array.

---

## Unit-by-Unit Analysis

### 1. Cephalus Prime

**Status**: UNDERCALCULATION (-44% error)  
**Calculated BV**: 579 | **Expected BV**: 1038 | **Difference**: -459

#### Equipment List

```json
{
  "equipment": [
    { "id": "light-tag", "location": "LEFT_TORSO" },
    { "id": "laser-ams", "location": "LEFT_TORSO" },
    { "id": "laser-ams", "location": "RIGHT_TORSO" }
  ]
}
```

#### Weapon Analysis

- **light-tag**: Sensor equipment (NOT a weapon) - 0 BV
- **laser-ams** (2x): Defensive equipment (Anti-Missile System) - 0 weapon BV

**Weapons Found**: 0  
**Weapon BV**: 0  
**Ammo BV**: 0

#### Actual Calculation Trace

- `calculateOffensiveBVWithHeatTracking()` receives empty weapons array
- `calculateAmmoBVWithExcessiveCap()` receives empty weapons array
- Result: weaponBV = 0, ammoBV = 0

#### Breakdown

```
Defensive BV: 505.125
Offensive BV: 73.6
  - Weapon BV: 0
  - Ammo BV: 0
  - Speed Factor: 2.3
  - Explosive Penalty: 0
  - Defensive Equip BV: 0
Total Calculated: 579
Expected: 1038
Missing: 459 BV
```

#### Root Cause

**Missing weapon definitions in JSON file**. The unit has no weapons in the `equipment` array. The JSON file only lists defensive equipment (AMS) and sensors (TAG).

---

### 2. Pathfinder PFF-2T

**Status**: UNDERCALCULATION (-35% error)  
**Calculated BV**: 359 | **Expected BV**: 550 | **Difference**: -191

#### Equipment List

```json
{
  "equipment": [{ "id": "tag", "location": "RIGHT_ARM" }]
}
```

#### Weapon Analysis

- **tag**: Sensor equipment (NOT a weapon) - 0 BV

**Weapons Found**: 0  
**Weapon BV**: 0  
**Ammo BV**: 0

#### Actual Calculation Trace

- `calculateOffensiveBVWithHeatTracking()` receives empty weapons array
- `calculateAmmoBVWithExcessiveCap()` receives empty weapons array
- Result: weaponBV = 0, ammoBV = 0

#### Breakdown

```
Defensive BV: 321.1
Offensive BV: 37.5
  - Weapon BV: 0
  - Ammo BV: 0
  - Speed Factor: 1.5
  - Explosive Penalty: 0
  - Defensive Equip BV: 10 (Beagle Active Probe)
Total Calculated: 359
Expected: 550
Missing: 191 BV
```

#### Root Cause

**Missing weapon definitions in JSON file**. The unit has no weapons in the `equipment` array. Only a TAG sensor is listed.

---

### 3. Cephalus A

**Status**: UNDERCALCULATION (-26% error)  
**Calculated BV**: 597 | **Expected BV**: 809 | **Difference**: -212

#### Equipment List

```json
{
  "equipment": [
    { "id": "clan-tag", "location": "LEFT_TORSO" },
    { "id": "laser-ams", "location": "RIGHT_TORSO" }
  ]
}
```

#### Weapon Analysis

- **clan-tag**: Sensor equipment (NOT a weapon) - 0 BV
- **laser-ams**: Defensive equipment (Anti-Missile System) - 0 weapon BV

**Weapons Found**: 0  
**Weapon BV**: 0  
**Ammo BV**: 0

#### Actual Calculation Trace

- `calculateOffensiveBVWithHeatTracking()` receives empty weapons array
- `calculateAmmoBVWithExcessiveCap()` receives empty weapons array
- Result: weaponBV = 0, ammoBV = 0

#### Breakdown

```
Defensive BV: 505.125
Offensive BV: 91.52
  - Weapon BV: 0
  - Ammo BV: 0
  - Speed Factor: 2.86
  - Explosive Penalty: 0
  - Defensive Equip BV: 0
Total Calculated: 597
Expected: 809
Missing: 212 BV
```

#### Root Cause

**Missing weapon definitions in JSON file**. The unit has no weapons in the `equipment` array. Only defensive equipment (AMS) and sensors (TAG) are listed.

---

### 4. Koshi Z

**Status**: UNDERCALCULATION (-25% error)  
**Calculated BV**: 727 | **Expected BV**: 970 | **Difference**: -243

#### Equipment List

```json
{
  "equipment": [
    { "id": "iatm-3", "location": "LEFT_ARM" },
    { "id": "iatm-3", "location": "RIGHT_ARM" }
  ]
}
```

#### Weapon Analysis

- **iatm-3** (2x): Improved ATM-3 missile weapon

**Weapons Found**: 2  
**Weapon BV**: 126 (per breakdown)  
**Ammo BV**: 42 (per breakdown)

#### Actual Calculation Trace

- `calculateOffensiveBVWithHeatTracking()` receives 2 iATM-3 weapons
- Weapons are sorted by heat and BV
- Heat tracking applied (some weapons may be halved if heat exceeds efficiency)
- `calculateAmmoBVWithExcessiveCap()` called with:
  - weapons: [{ id: "iatm-3", bv: 52 }, { id: "iatm-3", bv: 52 }]
  - ammo: [{ id: "Clan Ammo iATM-3", bv: X, weaponType: "iatm-3" }, ...]

#### Ammo Capping Analysis

- **Weapon Type**: iatm-3
- **Base Weapon BV**: 52 per weapon
- **Total Weapon BV**: 104 (2 weapons × 52)
- **Ammo BV Before Capping**: Unknown (not in breakdown)
- **Ammo Cap**: Should be 104 (sum of base weapon BV)
- **Ammo BV After Capping**: 42 (per breakdown)

**Ammo Capping Logic**: CORRECT

- The function `calculateAmmoBVWithExcessiveCap()` receives `config.weapons` which contains base BV values
- It builds `weaponBVByType` by summing weapon BV by type (line 568)
- It caps ammo BV to the matching weapon BV (line 581)
- No evidence of using modified BV for the cap

#### Breakdown

```
Defensive BV: 294.525
Offensive BV: 432
  - Weapon BV: 126
  - Ammo BV: 42
  - Speed Factor: 2.16
  - Explosive Penalty: 30 (NovaCEWS + Active Probe)
  - Defensive Equip BV: 12
Total Calculated: 727
Expected: 970
Missing: 243 BV
```

#### Root Cause

**Possible causes**:

1. **Heat tracking penalty**: Weapons may be getting halved due to heat exceeding efficiency
2. **Ammo BV calculation**: The ammo BV (42) seems low relative to weapon BV (126)
3. **Missing ammo tons**: The unit may have more ammo than is being calculated
4. **Explosive penalty**: The 30 BV penalty for NovaCEWS/Active Probe may be incorrect

**Note**: This is the ONLY unit with weapons defined. The ammo capping logic itself appears correct.

---

### 5. Porcupine PRC-3N

**Status**: UNDERCALCULATION (-22% error)  
**Calculated BV**: 400 | **Expected BV**: 511 | **Difference**: -111

#### Equipment List

```json
{
  "equipment": [{ "id": "laser-ams", "location": "LEFT_TORSO" }]
}
```

#### Weapon Analysis

- **laser-ams**: Defensive equipment (Anti-Missile System) - 0 weapon BV

**Weapons Found**: 0  
**Weapon BV**: 0  
**Ammo BV**: 0

#### Actual Calculation Trace

- `calculateOffensiveBVWithHeatTracking()` receives empty weapons array
- `calculateAmmoBVWithExcessiveCap()` receives empty weapons array
- Result: weaponBV = 0, ammoBV = 0

#### Breakdown

```
Defensive BV: 331.288
Offensive BV: 68.8
  - Weapon BV: 0
  - Ammo BV: 0
  - Speed Factor: 3.44
  - Explosive Penalty: 0
  - Defensive Equip BV: 0
Total Calculated: 400
Expected: 511
Missing: 111 BV
```

#### Root Cause

**Missing weapon definitions in JSON file**. The unit has no weapons in the `equipment` array. Only defensive equipment (AMS) is listed.

---

## Code Analysis

### Ammo BV Capping Logic

**File**: `src/utils/construction/battleValueCalculations.ts`  
**Function**: `calculateAmmoBVWithExcessiveCap()` (lines 559-585)

```typescript
export function calculateAmmoBVWithExcessiveCap(
  weapons: Array<{ id: string; bv: number }>,
  ammo: Array<{ id: string; bv: number; weaponType: string }>,
): number {
  if (!ammo || ammo.length === 0) return 0;

  const weaponBVByType: Record<string, number> = {};
  for (const weapon of weapons) {
    const weaponType = normalizeEquipmentId(weapon.id);
    weaponBVByType[weaponType] = (weaponBVByType[weaponType] ?? 0) + weapon.bv;  // LINE 568
  }

  const ammoBVByType: Record<string, number> = {};
  for (const a of ammo) {
    const normalizedType = normalizeEquipmentId(a.weaponType);
    ammoBVByType[normalizedType] = (ammoBVByType[normalizedType] ?? 0) + a.bv;
  }

  let totalAmmoBV = 0;
  for (const ammoType of Objec
```
