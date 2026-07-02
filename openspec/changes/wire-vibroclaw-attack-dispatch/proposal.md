# Proposal: wire-vibroclaw-attack-dispatch

## Why

The `battle-armor-combat` capability already specifies the Vibroclaw Attack requirement (damage = `missilesHit(shootingStrength) × vibroClaws`, UI hides the action when `vibroClaws === 0`), and the resolver is fully implemented with unit tests at `src/utils/gameplay/battlearmor/vibroClaw.ts` — but it is an **orphan module**: `resolveVibroClawAttack` has zero production call sites (council evidence 2026-07-02, Captain-verified). The wired battle-armor compute layer (`src/lib/combat/baCombat.ts`) still carries the stale doc comment "§7 vibroclaw... deferred to PR-L3 and PR-L4"; PR-L2 (swarm, `43e0a8288`) and PR-L3 (leg attack, `c7e264ecc`) shipped, leaving vibroclaw as the last unwired Wave-8 battle-armor tail (PR-L4).

This is the same orphan pattern the repo previously flagged and fixed for indirect fire — spec and resolver exist, dispatch doesn't.

## What Changes

- **Damage-model parity fix (scope amendment, discovered at wiring time)**: the orphan resolver implemented a deterministic `1 + ceil(0.5 × troopers)` per-claw formula from the archived `add-battlearmor-combat-behavior` §8 — NOT the living spec's cluster model and NOT MegaMek parity (`BAVibroClawAttackAction.getDamageFor` = `Compute.missilesHit(shootingStrength) × vibroClaws`, verified against MegaMek source). The resolver now implements the cluster-table model, applying total damage in MegaMek's claw-sized clusters, each with its own front-arc hit-location roll. The original "resolver is spec-complete" premise was false; wiring the wrong formula would have baked in non-parity.
- **Combat dispatch**: `dispatchVibroClawAttack` (battlearmor/vibroClawDispatch.ts) validates legality (squad attacker with claws, adjacency, supported target type), emits a `VibroClawAttackResolved` record event, and applies each damage cluster through the standard damage pipeline as `DamageApplied` events — following the PR-L3 `LegAttack` delivery shape.
- **Interactive declaration**: a BA squad with `vibroClaws ≥ 1` adjacent to an enemy can declare the vibroclaw attack in the interactive session (action id + engine command), and the resolved damage/events flow through the existing physical-attack event pipeline.
- **UI gating**: the tactical action surface exposes the vibroclaw action only when the active squad's `vibroClaws ≥ 1` (satisfying the existing spec's "UI MUST hide" clause), using the equipment-reality gating pattern established for MASC/Supercharger (`activeUnitHasMASC`-style context flag).
- **Stale doc comment** in `baCombat.ts` updated to reflect §7 shipping.

## Capabilities

### Modified Capabilities

- `battle-armor-combat`: the existing Vibroclaw Attack requirement gains dispatch/declaration scenarios — resolution SHALL route through the combat pipeline (not remain resolver-only), and the interactive declaration path SHALL exist. Damage math scenarios are unchanged (already specified and unit-tested).

_Not modified_: `physical-attack-system` (BA attacks dispatch through the battle-armor combat layer, matching swarm/leg-attack precedent); `battle-armor-unit-system` (construction fields `hasVibroClaws`/`vibroClawCount` already exist).

## Non-goals

- ~~No changes to vibroclaw damage math~~ — AMENDED: the damage math WAS changed (cluster-model parity fix above); the original non-goal rested on a false premise.
- No to-hit gate in v1 — mirrors the leg-attack precedent (the living spec specifies no roll for either BA melee attack); MegaMek's physical to-hit gate is a recorded parity delta for a future change.
- v1 dispatch targets mech-style units (top-level armor maps); per-type combat-state targets (vehicle/proto/squad/aero) are rejected with a typed reason — routing their damage into per-type pipelines is follow-up scope, matching the living spec's mech-target scenarios.
- No PR-M aerospace work.
- No changes to swarm-fire's flat vibroclaw damage bonus (separate, already-shipped requirement).

## Impact

- **Combat layer**: `src/lib/combat/baCombat.ts` (dispatch), interactive-session battle-armor action wiring (mirroring the `LegAttack` declaration path).
- **UI**: tactical action dock/physical-attack surface gains the gated vibroclaw command.
- **Tests**: dispatch-level tests (declaration → resolution → damage events) complementing the existing resolver unit tests; a UI gating test (hidden at `vibroClaws === 0`).
- **Size**: small (wiring + gating; the heavy lifting shipped in the resolver).
