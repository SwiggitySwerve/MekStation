# Implement MegaMekLab BV2 Formula

## Why

Current BV calculations differ from MegaMekLab due to formula simplifications. For the Marauder C test case:

- **Current MekStation**: ~1,622 BV
- **MegaMekLab reference**: 1,711 BV

The 89-point difference stems from six formula differences that need to be addressed to ensure consistency with the established BattleTech software reference implementation.

## What Changes

### 1. Gyro Contribution to Defensive BV

**Current**: Gyro not included in defensive BV
**New**: `gyroBV = tonnage × 0.5`

For a 75-ton mech: 75 × 0.5 = 37.5 added to defensive BV.

### 2. Defensive Speed Factor

**Current**: Speed factor only applied to final BV
**New**: Apply TMM-based speed factor to defensive BV separately

```
Defensive BV = (armorBV + structureBV + gyroBV) × defensiveSpeedFactor
```

### 3. Running Heat Added to Heat Pool

**Current**: Only weapon heat counted
**New**: Add 2 heat for running movement before calculating heat efficiency

```
Heat Generation = Running Heat (2) + Weapon Heat
```

### 4. Incremental Heat Penalties

**Current**: Apply flat heat adjustment to total offensive BV
**New**: Add weapons incrementally, apply 50% penalty to weapons that exceed dissipation threshold

```
for each weapon (sorted by BV, descending):
  cumulativeHeat += weapon.heat
  if cumulativeHeat <= dissipation:
    totalBV += weapon.bv
  else:
    totalBV += weapon.bv × 0.5  // 50% penalty
```

### 5. Weight Bonus

**Current**: Not included in offensive BV
**New**: Add tonnage as weight bonus to offensive BV

```
Offensive BV = weaponsBV + ammoBV + tonnage
```

### 6. Separate Offensive Speed Factor

**Current**: Single speed factor applied at end
**New**: Offensive BV gets its own speed factor (slightly different from defensive)

Per MegaMekLab:

- Defensive uses TMM-based factor (1.2 for TMM 2)
- Offensive uses modified factor (1.12 for same movement)

## Final BV Formula

```
Defensive BV = (armorBV + structureBV + gyroBV) × defensiveSpeedFactor
Offensive BV = (incrementalWeaponsBV + ammoBV + tonnage) × offensiveSpeedFactor
Total BV = round(Defensive BV + Offensive BV)
```

## Verification

Using Marauder C as reference:

- Armor: 184 × 2.5 = 460
- Structure: 114 × 1.5 = 171
- Gyro: 75 × 0.5 = 37.5
- Defensive: (460 + 171 + 37.5) × 1.2 = 802.2
- Weapons with heat tracking: 721
- Ammo: 15
- Weight: 75
- Offensive: (721 + 15 + 75) × 1.12 = 908.32
- **Total: 802.2 + 908.32 = 1,710.52 → 1,711 BV**

## Impact

- Improves accuracy of BV calculations
- Ensures consistency with MegaMekLab reference implementation
- Provides better balance comparisons for unit design

## Files Affected

1. `src/services/construction/CalculationService.ts` - Main BV formula changes
2. `src/types/validation/BattleValue.ts` - Add separate speed factor functions
3. `src/__tests__/service/construction/CalculationService.test.ts` - Update tests
