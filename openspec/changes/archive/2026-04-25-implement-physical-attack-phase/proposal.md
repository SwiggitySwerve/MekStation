# Change: Implement Physical Attack Phase

## Why

The turn loop advances through `GamePhase.PhysicalAttack` but the phase body is empty — a single `advancePhase` call, no declarations, no resolution. The `physicalAttacks/` module family is already scaffolded (decision, resolution, restrictions, toHit, damage, types) but nothing invokes it. Punches, kicks, clubs, charges, DFAs, and pushes never occur. This change brings the physical-attack phase to life: a declaration step, a restriction check (arm that fired a weapon SHALL NOT punch; same limb SHALL NOT kick and punch in the same turn), a to-hit resolution step, a damage step that feeds into the existing damage pipeline, and PSR triggering hooks for both attacker and target. See `openspec/changes/archive/2026-02-12-full-combat-parity/proposal.md` Phase 7 for the canonical rules reference.

## What Changes

- Replace the empty `PhysicalAttack` phase body with a full resolution: declare → validate → to-hit → resolve → damage → PSR triggers
- Implement **Punch**: to-hit = piloting + actuator mods + target-movement; damage = `ceil(weight / 10)` per arm; 1d6 punch hit-location table
- Implement **Kick**: to-hit = piloting - 2 + actuator mods + target-movement; damage = `floor(weight / 5)`; 1d6 kick hit-location table; hit triggers PSR on target, miss triggers PSR on attacker
- Implement **Charge**: to-hit = piloting + attacker-movement; damage to target = `ceil(weight / 10) × (hexesMoved - 1)`; damage to attacker = `ceil(targetWeight / 10)`; both sides take PSR
- Implement **Death From Above (DFA)**: to-hit = piloting; target damage = `ceil(weight / 10) × 3`; attacker leg damage = `ceil(weight / 5)`; miss = attacker fall
- Implement **Push**: to-hit = piloting - 1; no damage; target displaced 1 hex in attacker's facing
- Implement **Club**: melee weapons (hatchet / sword / mace / lance) with weapon-specific damage and to-hit modifiers per `physical-weapons-system`
- Enforce restrictions: arm that fired a weapon SHALL NOT punch; same limb SHALL NOT kick and punch; damaged actuators add to-hit modifiers; required actuators (lower arm + hand for punch; upper leg + foot for kick) SHALL be intact
- Queue `PhysicalAttackTarget` PSR on every physical hit (delegated to `wire-piloting-skill-rolls`)
- Queue `MissedDFA` / `MissedCharge` PSRs on misses (attacker falls on failure)
- Feed damage into the damage pipeline via `integrate-damage-pipeline`
- Emit `PhysicalAttackDeclared`, `PhysicalAttackResolved` events

## Rule Sources

Every attack type in this change cites **Total Warfare** as the canonical source. Implementers: where tables are referenced, copy the page's table verbatim into the delta spec so the implementation is not derived at second hand.

- **Punch** (to-hit, damage, hit-location table): Total Warfare p.144–145
- **Kick** (to-hit −2, damage floor(w/5), PSR on hit/miss, kick hit-location table): Total Warfare p.145–146
- **Charge** (to-hit, damage to target `ceil(w/10) × (hexesMoved − 1)`, damage to attacker `ceil(targetW/10)`, both sides PSR): Total Warfare p.146–147. On MISS with an existing commitment-to-destination, the attacker still enters the target hex (displacement rule) and both sides still take collision PSRs; no damage applies on miss.
- **DFA / Death From Above** (to-hit piloting, target damage `ceil(w/10) × 3`, attacker leg damage `ceil(w/5)`, miss → attacker fall): Total Warfare p.147–148. On MISS the attacker falls per standard fall rules (forward/backward direction roll); the attacker takes full leg damage regardless of hit or miss.
- **Push** (to-hit −1, no damage, displacement 1 hex in attacker's facing): Total Warfare p.148. Push destination hex blocked / off-map → push fails; both units stay in place; target still takes PSR.
- **Club / melee weapon** per-weapon stats and club damage formulas: Total Warfare p.149–150 + `physical-weapons-system` spec for the equipment-specific rows.
- **Punch hit-location table (1d6)**: Total Warfare p.145 table. The proposal's 10.1 copy (LA / LT / CT / RT / RA / Head for rolls 1–6) SHALL be cross-checked against the printed table before implementation.
- **Kick hit-location table (1d6)**: Total Warfare p.146 table (legs only).

## Dependencies

- **Requires**: `fix-combat-rule-accuracy` (correct base math), `integrate-damage-pipeline` (physical damage feeds the same pipeline), `wire-piloting-skill-rolls` (PSR triggers fire on hit and miss), `wire-firing-arc-resolution` (physical attacks need arc for hit-location table selection)
- **Blocks**: None in Lane A. Opens the door for AI improvements (Lane C) and attack-phase UI (Lane B4)

## Impact

- **Affected specs**: `physical-attack-system` (phase resolution), `physical-weapons-system` (integrate melee weapons), `game-session-management` (physical phase is non-empty)
- **Affected code**: `src/engine/GameEngine.phases.ts` (physical-phase branch), `src/utils/gameplay/physicalAttacks.ts`, `src/utils/gameplay/physicalAttacks/` (decision, resolution, restrictions, toHit, damage), `src/utils/gameplay/hitLocation.ts` (punch/kick tables), `src/simulation/ai/` (bot can declare physical attacks)
- **New events**: `PhysicalAttackDeclared`, `PhysicalAttackResolved`
- **No new modules required**; module files already exist and need filling in.
