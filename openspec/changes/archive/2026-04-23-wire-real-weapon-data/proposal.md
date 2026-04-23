# Change: Wire Real Weapon Data into Combat Resolution

## Why

The MekStation combat engine currently hardcodes `damage = 5` and `heat = 3` for every weapon fired, and uses a fixed `(3, 6, 9)` range bracket regardless of the weapon. As a result, an AC/20 hits for the same damage as a Small Laser and long-range LRMs fire at the same ranges as close-in SRMs. The full weapon catalog with correct damage, heat, and range values already exists in `IWeaponData` — the attack loop just doesn't read it. This change replaces the hardcoded values in the attack loop with catalog reads and accumulates real weapon heat per firing unit. Without this, downstream damage and heat wiring operate on fabricated numbers. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 1 for the source of the hardcoded-values bug list.

**Scope note**: this change was split from an earlier draft that also bundled ammo consumption + bin mutation. Ammo consumption is an independent mutable-state concern with its own replay-fidelity + `OutOfAmmo` semantics, so it is now the separate change `wire-ammo-consumption` that lands immediately after this one. Keeping the split tight means this change can be validated purely against catalog reads and per-weapon heat sums without intruding on bin-state invariants.

## What Changes

- Replace every occurrence of `damage: 5` in the attack-resolution path with the weapon's actual `damage` field from `IWeaponData`
- Replace every occurrence of `heat: 3` with the weapon's actual `heat` field
- Replace the hardcoded range bracket `(3, 6, 9)` with the weapon's per-bracket ranges (`shortRange`, `mediumRange`, `longRange`, optional `extremeRange`)
- Accumulate real weapon heat per firing unit for the current turn, replacing the `weapons.length * 10` approximation
- Add `damage`, `heat`, and `weaponId` fields to the attack-resolved event payload so downstream consumers read the real values

**Deferred to `wire-ammo-consumption`** (do NOT land in this change): ammo-bin initialization from construction data, per-firing bin mutation, `AmmoConsumed` event, `OutOfAmmo` invalidation path, bot-ammo-awareness in `AttackAI`. The attack path in this change SHALL assume weapons have ammo available (existing placeholder behavior) so that replay fidelity for the damage/heat wiring is provable without interleaving ammo state.

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (underlying to-hit math must be correct before damage wiring is meaningful)
- **Blocks**: `wire-ammo-consumption` (the downstream change that adds bin mutation), `integrate-damage-pipeline` (damage pipeline can't apply real damage until real damage values arrive at it), `wire-heat-generation-and-effects` (heat generation reads per-weapon heat)

## Impact

- **Affected specs**: `weapon-resolution-system` (consume real weapon fields), `damage-system` (accept real damage values from attack resolution), `heat-management-system` (real per-weapon heat instead of approximation). **`ammo-tracking` is no longer modified by this change** — it moves to `wire-ammo-consumption`.
- **Affected code**: `src/engine/GameEngine.ts`, `src/engine/GameEngine.phases.ts`, `src/utils/gameplay/gameSession.ts`, `src/utils/gameplay/gameSessionAttackResolution.ts`, test fixtures in `src/__tests__/unit/utils/gameplay/attackResolution.test.ts`
- **Test fallout**: Several test fixtures intentionally use `damage: 5` as placeholders; these need to become real weapon fixtures from the catalog (or explicit mocks that document the hardcoding)
- **No new specs created**. No new external dependencies.
