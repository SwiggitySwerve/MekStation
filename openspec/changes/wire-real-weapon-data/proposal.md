# Change: Wire Real Weapon Data into Combat Resolution

## Why

The MekStation combat engine currently hardcodes `damage = 5` and `heat = 3` for every weapon fired, uses a fixed `(3, 6, 9)` range bracket regardless of the weapon, assumes infinite ammo, and never consumes rounds from bins. As a result, an AC/20 hits for the same damage as a Small Laser, long-range LRMs fire at the same ranges as close-in SRMs, and an autocannon never runs dry. The full weapon catalog with correct damage, heat, and range values already exists in `IWeaponData`, and ammo bins are already tracked in the construction data — they just aren't consumed by the engine. This change replaces hardcoded values in the attack loop with reads from the catalog, wires real heat per firing weapon, and enforces ammo consumption from matching bins. Without this, downstream damage and heat wiring operate on fabricated numbers. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 1 for the source of the hardcoded-values bug list.

## What Changes

- Replace every occurrence of `damage: 5` in the attack-resolution path with the weapon's actual `damage` field from `IWeaponData`
- Replace every occurrence of `heat: 3` with the weapon's actual `heat` field
- Replace the hardcoded range bracket `(3, 6, 9)` with the weapon's per-bracket ranges (`shortRange`, `mediumRange`, `longRange`, optional `extremeRange`)
- Initialize per-unit ammo state from construction data at session start; each ton of ammo is a separate `IAmmoBin`
- Consume 1 round per single-shot firing and 1 salvo per cluster firing from a matching bin
- Prevent a weapon from firing when no matching non-empty bin exists; emit an `AttackInvalid` event with reason `OutOfAmmo`
- Emit an `AmmoConsumed` event for every firing that draws from a bin
- Accumulate real weapon heat per firing unit, replacing the `weapons.length * 10` approximation
- Surface updated ammo counts in the event log so UI consumers can display them

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (underlying to-hit math must be correct before damage wiring is meaningful)
- **Blocks**: `integrate-damage-pipeline` (damage pipeline can't apply real damage until real damage values arrive at it), `wire-heat-generation-and-effects` (heat generation reads per-weapon heat)

## Impact

- **Affected specs**: `weapon-resolution-system` (consume real weapon fields), `damage-system` (accept real damage values from attack resolution), `ammo-tracking` (consumption integrated with firing), `heat-management-system` (real per-weapon heat instead of approximation)
- **Affected code**: `src/engine/GameEngine.ts`, `src/engine/GameEngine.phases.ts`, `src/utils/gameplay/gameSession.ts`, `src/utils/gameplay/gameSessionAttackResolution.ts`, `src/utils/gameplay/ammoTracking.ts`, `src/simulation/ai/AttackAI.ts`, test fixtures in `src/__tests__/unit/utils/gameplay/attackResolution.test.ts`
- **Test fallout**: Several test fixtures intentionally use `damage: 5` as placeholders; these need to become real weapon fixtures from the catalog (or explicit mocks that document the hardcoding)
- **No new specs created**. No new external dependencies.
