# Change: Add Infantry Battle Value

## Why

Conventional infantry BV currently returns 0, misstating contract payouts and scenario balance whenever infantry are on the board. This change adds infantry BV 2.0 computation per TechManual, scaling per trooper, armor kit, weapons, field gun (if any), motive, and anti-mech training. Depends on `add-infantry-construction` for legal inputs.

## What Changes

- Add per-trooper BV = (primary weapon BV / damageDivisor) × 1.0 + secondary contribution + armor kit modifier
- Add platoon BV = perTrooperBV × troopers × motiveMultiplier
- Add field gun BV: mech-scale weapon BV × 1.0 (the gun keeps full BV value) + ammo BV
- Add anti-mech training multiplier: 1.1× final BV
- Add armor kit modifier per kit type (Flak +5%, Camo +10%, Sneak Camo +15%, etc.)
- Add motive multiplier: Foot 1.0, Jump 1.1, Motorized 1.05, Mechanized 1.15
- Add pilot skill multiplier using shared table
- Expose breakdown on unit
- Add parity harness vs MegaMekLab canonical infantry

## Non-goals

- Civilian infantry BV (non-combatants)
- Partisan / irregular modifications

## Dependencies

- **Requires**: `add-infantry-construction`, `battle-value-system`
- **Blocks**: `add-infantry-combat-behavior`

## Impact

- **Affected specs**: `battle-value-system` (MODIFIED — infantry path), `infantry-unit-system` (ADDED — BV breakdown)
- **Affected code**: `src/utils/construction/infantry/infantryBV.ts` (new), `src/utils/construction/battleValueCalculations.ts` (dispatch), infantry status bar (new)
- **Validation target**: ≥ 90% within 5% vs canonical infantry platoons
