# Design — Combat Fidelity Suite

## Architecture Decisions

### D1 — Anchor on Atlas AS7-D, not synthetic medium laser

**Choice**: Hydrate `toAIUnitState()` with the real Atlas AS7-D loadout (AC/20 + LRM-20 + 4× Medium Laser + SRM-6) as the anchor case for the layer tests.

**Rationale**: Two proposers (Hephaestus, Oracle) initially disagreed on whether to fix the engine plumbing for synthetic-ML-only first or do catalog wiring first. The synthesis: Atlas's mixed loadout exercises every weapon-family code path (cluster hits, minimum range, ammo, heat) that the synthetic single-laser path skips. Without that, the test pyramid is testing fiction even when its assertions pass.

**Trade-off accepted**: P1 (catalog hydration) is no longer the smallest possible plumbing fix. We pay the ~3h cost up-front so every downstream test exercises real BattleTech mechanics.

**Discovered during**: Phase 3 cross-attack between Hephaestus and Oracle.

---

### D2 — `SeededD6Roller` as a separate adapter, not a SeededRandom method

**Choice**: New `src/simulation/core/SeededD6Roller.ts` that takes a `SeededRandom` instance and implements the existing `D6Roller` interface (`src/utils/gameplay/diceTypes.ts:20`).

**Rationale**: `SeededRandom` (Mulberry32, returns floats) and `D6Roller` (returns 1-6 integers, defaults to `Math.random` per face) live in different layers and have intentional separation — `SeededRandom` is engine infrastructure, `D6Roller` is gameplay-rules infrastructure. Bridging via an adapter keeps both contracts intact and makes the seam explicit for production swaps (CryptoDiceRoller for server, ReplayDiceRoller for P2P guest, SeededD6Roller for tests).

**Threading pattern**: `roller?: D6Roller` becomes an optional parameter on `checkCriticalHitTrigger`, `resolveDamage`, `resolvePhysicalAttack`, and any other `roll2d6()`-using utility. Default is the existing `defaultD6Roller` (= `Math.random`) so no production callsite breaks. Test callsites pass an explicit roller. An ESLint or grep-based audit (P0 task) confirms no production callsite drops the roller.

**Risk**: A future caller could silently skip determinism by omitting the optional roller. Mitigation: add a unit test that asserts every public function in `src/utils/gameplay/damage/` and `src/utils/gameplay/criticalHitResolution/` accepts a `roller` parameter, and a CI grep that fails if `Math.random` appears outside `defaultD6Roller`.

---

### D3 — Critical hit return capture pattern

**Choice**: In `resolve.ts:61`, change

```ts
checkCriticalHitTrigger(locDamage.structureDamage); // discards
```

to

```ts
const critTrigger = checkCriticalHitTrigger(locDamage.structureDamage, roller);
if (critTrigger.triggered) {
  const critOutcome = resolveCriticalHits({
    unit, location: locDamage.location, count: critTrigger.count, roller,
  });
  criticalHits.push(...critOutcome.hits);
  componentEffects.push(...critOutcome.effects);
}
```

**Rationale**: The `criticalHits` array on `IDamageResult` (`resolve.ts:46`) already exists and is already returned upstream — but it's always empty because no one populates it. The fix is mechanical: capture the trigger, dispatch to `resolveCriticalHits()`, append. `resolveCriticalHits()` already exists at `criticalHitResolution/resolver.ts:18` with a complete implementation including engine/gyro/sensors/cockpit/actuator/weapon/heatsink slot selection.

**Event emission seam**: `weaponAttack.ts` (the runner-side caller of `resolveDamage`) emits `CriticalHit`, `CriticalHitResolved`, and `ComponentDestroyed` from the populated `criticalHits` array. This keeps event emission in the runner layer (separation of concerns: utils compute, runner emits).

---

### D4 — Event emission goes in the runner, not in utility helpers

**Choice**: All combat events (`AttackDeclared`, `AttackResolved`, `CriticalHit`, `CriticalHitResolved`, `ComponentDestroyed`, `LocationDestroyed`, `TransferDamage`, `HeatGenerated`, `HeatDissipated`, `HeatEffectApplied`, `ShutdownCheck`, `AmmoConsumed`, `AmmoExplosion`, `PilotHit`) are emitted from the runner's phase files (`src/simulation/runner/phases/*.ts`). Utility helpers (`damage/`, `criticalHitResolution/`, `heat`, etc.) remain pure — they compute and return data, they do NOT touch the event stream.

**Rationale**: This matches the existing pattern (`physicalAttack.ts:102` emits `PhysicalAttackDeclared`, `physicalAttack.ts:214` emits `PhysicalAttackResolved`, with the utility `resolvePhysicalAttack` doing pure computation in between). Keeping utils pure means tests can call them in isolation without an event sink. The runner remains the single emission point so event ordering is auditable in one file per phase.

**Causal ordering**: `AttackDeclared` (pre-roll) → `AttackResolved` (post-roll, with `hit: bool` + rolledTN + modifiers) → `DamageApplied` (existing) → `LocationDestroyed` (if armor + structure both zeroed) → `TransferDamage` (if damage flows to next location) → `CriticalHit` (per crit triggered) → `CriticalHitResolved` (per slot resolved) → `ComponentDestroyed` (per component fully destroyed) → `UnitDestroyed` (if CT or pilot KIA).

Downstream consumers (replay UI, MetricsCollector, swarm aggregation, P2P sync, anomaly detectors) consume the event stream in declared order. They MUST NOT reach into engine state — they read events.

---

### D5 — MegaMek as golden oracle, not as porting source

**Choice**: Use MegaMek (local at `E:/Projects/megamek/`, GPL-3.0) for **two specific lookups only**:
- Hit-location 2d6 → location-per-arc tables (`Mek.innerRollHitLocation` at `Mek.java:1976-2034`)
- Critical threshold ladder (`TWGameManager.criticalEntity` at `TWGameManager.java:21564-21586`)

These are pure lookup tables with no Java-isms — they become deterministic pure functions in TS test fixtures. We do NOT port `WeaponHandler` family code or any `Vector<Report>` infrastructure.

**Rationale**: Librarian's research found MegaMek has NO scenario-level weapon tests — only modifier-arithmetic unit tests. There's no test corpus to lift; we author MekStation's scenario layer from scratch. But the canonical 2d6 tables ARE worth lifting as fixtures because they're authoritative and the rules are immutable per the BattleTech Total Warfare ruleset.

**License posture**: MekStation is Apache-2.0. MegaMek is GPL-3.0. Lifting pure data lookup tables (not algorithms) as test fixtures from a GPL-3.0 source into an Apache-2.0 project is well-established as facts-and-data fair use, but to be safe the test fixtures are framed as "golden oracle assertions" derived from the BattleTech Total Warfare ruleset (which is the actual source-of-truth). MegaMek is cited as the verification reference, not as the data source.

---

### D6 — One OpenSpec change, 7 sequential PRs

**Choice**: Single `add-combat-fidelity-suite` change with 7 phases mapped 1:1 to PRs. Each PR self-contained, each PR's CI gate green before next phase starts.

**Rationale**: The gaps compound — no events ⇒ no scenario tests ⇒ no Monte Carlo. Splitting into multiple OpenSpec changes would fragment the spec deltas across changes that all need to merge in lockstep. One change with 7 PRs keeps the spec coherent and lets each PR's review focus on one layer.

**Phase boundaries** (intentional review checkpoints):
- P0 → P1: roller infrastructure must work in isolation before any engine wiring depends on it
- P1 → P2: catalog hydration must produce real weapon shapes before event payloads can carry meaningful weapon IDs
- P2 → P3: `AttackDeclared` / `AttackResolved` must fire correctly before crit events can be sequenced into the same chain
- P3 → P4: crit events must be wired before heat events (heat-induced criticals depend on crit infrastructure)
- P4 → P5: events must exist before MetricsCollector can parse them
- P5 → P6: metrics must be live before tests can assert on them

**Rejected alternative**: a single mega-PR. ~4000 LOC across 8+ files is unreviewable. Phased PRs at ~400-600 LOC each are reviewable.

---

### D7 — Defer infantry, battle armor, aerospace, vehicles structure damage

**Choice**: Phase 7 covers **BattleMechs, Combat Vehicles (armor only), and Aerospace fighters** for the Atlas-anchored fidelity proof. **Infantry, Battle Armor, ProtoMechs, vehicle structure damage, and aerospace movement/handlers are deferred** to follow-on changes.

**Rationale**: Momus surfaced that infantry JSON (`public/data/units/infantry/*.json`) has no per-location armor field, only `armorPoints: 0` + platoon counts. Vehicles have `byLocation` armor (FRONT/RIGHT/LEFT/REAR) but no internal structure values in the JSON. The damage pipeline at `src/utils/gameplay/damage/resolve.ts` requires structure to trigger crits and destruction — vehicles can't go through the full pipeline today without a vehicle-specific adapter.

**Honest scope**: "Any unit attacking with any weapon, any unit taking damage" was overclaim. The corrected scope is: any BattleMech firing any of its catalog weapons at any other BattleMech (or vehicle for armor depletion only) emits the full event chain with deterministic rolls.

**Follow-on changes scaffolded**:
- `add-combat-fidelity-catalog-matrix` — extend P1 hydration to all 4196 BattleMech variants
- `add-infantry-ba-damage-adapter` — platoon-damage adapter
- `add-vehicle-structure-rules` — vehicle internal structure + motive damage table
- `add-aerospace-combat-handlers` — atmosphere/space movement, capital weapons

---

### D8 — Spec follows code, not the other way around (snake_case wins)

**Choice**: The unified `UnitDestroyed.cause` closed set is snake_case, matching the live codebase across 15+ files (`src/types/gameplay/GameSessionInterfaces.ts:766`, `src/types/gameplay/CombatInterfaces.ts:350`, `src/utils/gameplay/damage/types.ts:45`, `criticalHitResolution/resolver.ts`, etc.). The prior kebab-case spec values at `damage-system/spec.md:397-398` are RENAMED to snake to align.

**Rationale**: A second OMO Council review (Lean++ thin) Phase 2 surfaced a three-way split: spec kebab vs code snake vs PR #515 snake. 5 sampled enums in `src/types/gameplay/` were ALL snake_case (`AttackResult`, `CriticalEffectType`, `GameEventType`, `MovementType`, terrain enums). The codebase convention is unambiguous; the spec is the anomaly. Renaming 15+ code files would have far higher blast radius than renaming spec values.

The `damage-system` delta in this change is the spec-side rename. The new `Phase 0.5` task list is the code-side reconciliation that ensures all three type files (`GameSessionInterfaces.ts`, `CombatInterfaces.ts`, `damage/types.ts`) carry the SAME 7 values: `'damage' | 'ammo_explosion' | 'pilot_death' | 'engine_destroyed' | 'shutdown' | 'ct_destroyed' | 'head_destroyed'`.

**Trade-off accepted**: The kebab-case `'pilot-killed'` and `'crew-kia'` spec-only values are dropped (no live code consumers existed). The kebab-case `'ct-destroyed'`, `'engine-destroyed'`, `'ammo-explosion'` are renamed to snake. `'head_destroyed'` is added as new. `'shutdown'` is added (was code-only, missing from spec).

**Discovered during**: Phase 2 of the second council review. Hephaestus initially proposed extending the kebab set; Explore-Deep's grep proved the codebase is overwhelmingly snake_case; the synthesis reversed direction.

---

### D9 — Closed enums for pilot- and match-terminal states folded into this change

**Choice**: The pilot and match terminal state taxonomies (`'unhurt' | 'wounded' | 'unconscious' | 'kia' | 'ejected'` and `'player_victory' | 'opfor_victory' | 'draw' | 'mutual_destruction' | 'timeout' | 'forfeit' | 'withdrawal'`) are introduced as new ADDED requirements in the `pilot-system` and `after-combat-report` source-of-truth specs.

**Rationale**: These taxonomies don't exist in the codebase yet. The existing `PilotStatus` at `src/types/pilot/PilotInterfaces.ts:30` is a campaign-tracking enum (`Active | Injured | MIA | KIA | Retired`), not a per-match terminal state. The match-terminal taxonomy is needed for the audit framework's conservation checks (sum of fates == roster size) and for downstream consumers (replay UI, MetricsCollector). The spec authors the constraint; P0.5 wires it into code.

**Conservation invariants**: The `after-combat-report` delta also asserts cross-side rules (sum of fates == roster size; mutual_destruction requires 0 survivors on both sides; KIA pilot count == cause:'pilot_death' + cause:'head_destroyed' UnitDestroyed events). These invariants give downstream consumers a contract to verify against.

**Trade-off accepted**: The terminal-state implementation work is part of P0.5 rather than a follow-on `add-match-outcome-taxonomy` change. This grows P0.5 by ~3h but eliminates a parallel OpenSpec change folder.

---

## Decisions discovered during execution

(Will be populated by Atlas / Hephaestus during implementation per the OMO Notepad Protocol's Decision Graduation Rule.)
