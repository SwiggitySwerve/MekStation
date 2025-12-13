# Implementation Tasks

## Pre-Implementation

- [x] Review current BV calculation in `CalculationService.ts`
- [x] Review current speed factor implementation in `BattleValue.ts`
- [x] Analyze MegaMekLab BV breakdown for Marauder C

## Type System Updates

- [ ] Add `getDefensiveSpeedFactor()` function to `BattleValue.ts`
- [ ] Add `getOffensiveSpeedFactor()` function to `BattleValue.ts`
- [ ] Document TMM-to-speed-factor mapping for both

## Defensive BV Implementation

- [ ] Add gyro BV calculation: `tonnage × 0.5`
- [ ] Apply defensive speed factor to (armor + structure + gyro)

## Offensive BV Implementation

- [ ] Add running heat constant (2 heat for running movement)
- [ ] Implement incremental weapon heat tracking
- [ ] Sort weapons by BV (descending) for optimal allocation
- [ ] Apply 50% penalty to weapons exceeding heat dissipation
- [ ] Add tonnage weight bonus to offensive BV
- [ ] Apply offensive speed factor

## Formula Integration

- [ ] Refactor `calculateBattleValue()` to use new formula
- [ ] Remove legacy heat adjustment (replaced by incremental)
- [ ] Remove single speed factor (now separate for defensive/offensive)

## Testing

- [ ] Add Marauder C exact match test (expect 1,711 BV)
- [ ] Add defensive BV component tests
- [ ] Add offensive BV component tests
- [ ] Add incremental heat penalty tests
- [ ] Add speed factor tests

## Validation

- [ ] Run `openspec validate --strict`
- [ ] Run full test suite
- [ ] Verify Marauder C BV matches MegaMekLab

## Cleanup

- [ ] Remove debug console.log statements
- [ ] Update JSDoc comments with new formulas

