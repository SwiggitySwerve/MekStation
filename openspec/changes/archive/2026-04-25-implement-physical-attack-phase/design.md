# Design: Implement Physical Attack Phase

## Context

The MekStation engine drives a turn loop through `GamePhase` values: Initiative → Movement → Weapon → **PhysicalAttack** → Heat → End. Today the `PhysicalAttack` branch in `src/engine/GameEngine.phases.ts` is a single `advancePhase()` call — declarations are never collected, restrictions never checked, to-hit never rolled, no damage applied, no PSRs queued. The supporting modules already exist as scaffolds:

- `src/utils/gameplay/physicalAttacks.ts` (entry-point, currently a stub)
- `src/utils/gameplay/physicalAttacks/decision.ts` — bot-level selection (partial)
- `src/utils/gameplay/physicalAttacks/restrictions.ts` — restriction predicates (partial; tasks 3.1, 3.2 done)
- `src/utils/gameplay/physicalAttacks/toHit.ts` — base + actuator modifiers (partial)
- `src/utils/gameplay/physicalAttacks/resolution.ts` — orchestrator (empty)
- `src/utils/gameplay/physicalAttacks/damage.ts` — damage computation (partial; punch/kick/DFA implemented)
- `src/utils/gameplay/physicalAttacks/types.ts` — `IPhysicalAttackDeclaration`, `PhysicalAttackType`, etc.
- `src/utils/gameplay/hitLocation.ts` — punch (10.1) and kick (10.2) tables done
- `src/simulation/ai/BotPlayer.ts` — has `playMovementPhase` / `playAttackPhase`, missing `playPhysicalAttackPhase`

Per the proposal, this work is gated behind four already-merged Tier-3/Tier-4 changes: `fix-combat-rule-accuracy`, `integrate-damage-pipeline`, `wire-piloting-skill-rolls`, `wire-firing-arc-resolution`. Those provide correct piloting math, the damage pipeline that physical hits feed, the PSR queue physical hits enqueue to, and the firing-arc resolver that hit-location selection consumes.

The change is currently 40/81 tasks complete. The remaining work is split between (a) finishing partially-implemented resolvers (charge clusters, DFA clusters, push displacement, club lance, restrictions 3.3–3.7) and (b) wiring the bot driver and the phase body itself (tasks 1.x and 11.x — the load-bearing integration glue).

The canonical rules source is **Total Warfare** p.144–150; secondary cross-check is the archived `2026-02-12-full-combat-parity` proposal Phase 7. Implementers SHALL copy printed tables verbatim into the delta spec rather than paraphrase.

## Goals / Non-Goals

**Goals:**

- Replace the empty `GamePhase.PhysicalAttack` body with a full declare → validate → to-hit → resolve → damage → PSR pipeline that runs deterministically under a seeded RNG.
- Implement all six physical attack types (Punch, Kick, Charge, DFA, Push, Club) at TechManual fidelity, with damage and to-hit cross-checked against printed tables on Total Warfare p.144–150.
- Enforce the full restriction matrix: no-fire-then-punch, no-hip-crit-then-kick, no-same-limb-twice, actuator presence (lower arm + hand for punch; upper leg + foot for kick), jump-required-for-DFA, run-required-for-charge.
- Queue `PhysicalAttackTarget` PSR on every hit and `KickMiss` / `MissedCharge` / `MissedDFA` PSR on the attacker for relevant misses, delegating actual roll execution to `wire-piloting-skill-rolls`.
- Feed all physical damage through `resolveDamage()` (the same pipeline weapon hits use post `integrate-damage-pipeline`).
- Drive the phase from `BotPlayer.playPhysicalAttackPhase` so AI-controlled units participate in `InteractiveSession` games — closing the original Phase 1 roadmap gap.
- Emit `PhysicalAttackDeclared` and `PhysicalAttackResolved` events for replay determinism and UI subscription.

**Non-Goals:**

- DFA / charge declaration by bot. Tasks 11.3 explicitly defers these to Lane C retreat/aggression. The bot in this change punches and kicks only.
- New attack-phase UI components. Lane B4 (deferred) owns the React surface for human declaration; this change exposes the events the UI will subscribe to but does not render them.
- Persistence of physical-attack declarations across save/load. Wave-4 persistence specs own that. Declarations live in the in-memory turn record.
- Weapon ↔ physical interleaving in a single phase (e.g., punch-then-fire). The phase order remains Weapon → Physical; we do not add cross-phase ordering options.
- Vehicular / battlearmor / infantry physical attacks. Scope is BattleMech-on-BattleMech only; vehicle melee is a separate spec.
- Industrial-mech-only physical weapons (e.g., chainsaws beyond hatchet/sword/mace/lance). Lance is in scope per task 9.4; deeper industrial melee is deferred.

## Decisions

### Decision 1: Phase resolution is a synchronous reducer over the declaration list, not a per-unit async loop

**Choice:** The new `GamePhase.PhysicalAttack` body collects all declarations from human input + `BotPlayer.playPhysicalAttackPhase` in a single pass, then runs the resolution loop synchronously over that list before calling `advancePhase()`.

**Rationale:** Matches the existing `GamePhase.WeaponAttack` pattern (also a sync reducer over declarations). Keeps the `GameEngine.phases.ts` switch statement uniform and replay-deterministic — a seeded RNG plus a fixed declaration order produces identical event streams. Async-per-unit would require interleaved promises and break the event-stream replay test (task 12.5).

**Alternative considered:** Per-unit async resolver with awaitable PSR queue. Rejected: PSRs are queued for a *later* phase (the next PSR-resolution sub-step delegated to `wire-piloting-skill-rolls`), so the physical phase doesn't actually need to await them — and we'd lose synchronous replay.

### Decision 2: Restrictions are pure predicates, not exception-throwing validators

**Choice:** `physicalAttacks/restrictions.ts` exports `validateDeclaration(decl, attacker, target, turnState): IPhysicalAttackInvalidReason | null`. The resolution step short-circuits when the validator returns a non-null reason, emitting `PhysicalAttackInvalid { reason }` instead of `PhysicalAttackResolved`.

**Rationale:** Pure predicates are testable in isolation (each scenario in the spec maps to one predicate test), composable (the validator can call `armFiredThisTurn()`, `hasIntactPunchActuators()`, etc.), and replay-safe (no thrown exception to swallow non-determinism). The reason enum is finite and documented in the delta spec, so UI can localise the rejection message.

**Alternative considered:** Throw `PhysicalAttackInvalidError` and catch at the phase boundary. Rejected: exceptions in a synchronous reducer pollute the event stream's stack semantics and make replay diffing harder. Pure predicates also align with the existing `wire-piloting-skill-rolls` PSR validator pattern.

### Decision 3: Hit-location tables live in `hitLocation.ts` keyed by attack type, not embedded per-resolver

**Choice:** Tasks 10.1 and 10.2 add `rollPunchHitLocation(rng): MechLocation` and `rollKickHitLocation(rng): MechLocation` next to the existing weapon-hit-location tables. Resolvers call them; resolvers do not embed table literals.

**Rationale:** Tables are data, not control flow. Co-locating them keeps the printed-table-verbatim invariant (proposal Rule Sources note) reviewable in one file, and lets future hit-location tweaks (e.g., partial cover, prone targets) layer cleanly. Charge and DFA reuse the standard hit-location table via the existing `rollHitLocation()` helper — no new tables needed.

**Alternative considered:** Inline the table in each resolver. Rejected: violates the verbatim-source rule, duplicates the seeded-RNG plumbing, and creates 5+ places to update if a future erratum changes a row.

### Decision 4: Bot driver returns `IPhysicalAttackDeclaration | null`, mirroring `playAttackPhase`

**Choice:** Add `BotPlayer.playPhysicalAttackPhase(unit, enemies, state): IPhysicalAttackDeclaration | null`. Return `null` when no eligible declaration exists (no adjacent enemies, all limbs destroyed, etc.). The phase body filters nulls before resolution.

**Rationale:** Identical contract to `playMovementPhase` / `playAttackPhase` (`InteractiveSession.ts:255,290`). Same null-skip semantics. Same seeded-RNG injection. Reduces cognitive load on contributors who already know the bot driver pattern.

**Alternative considered:** Return `IPhysicalAttackDeclaration[]` to support multi-attack-per-unit (kick + punch in same turn). Rejected: spec says same limb cannot kick *and* punch; arms can punch but not kick (anatomy). The 1-declaration-per-unit-per-phase rule is the BattleTech default. If multi-physical-per-unit is needed later, the array form is an additive change.

### Decision 5: `PhysicalAttackResolved` event carries the full hit/miss/damage payload; UI does not need to subscribe to `DamageApplied` separately for physicals

**Choice:** `PhysicalAttackResolved { attackerId, targetId, attackType, hit: boolean, toHitTN, roll, damage?: { location, amount }[], psrTriggers: string[] }`. UI / replay can render the entire physical attack from this one event.

**Rationale:** Weapon attacks emit `WeaponAttackResolved` then a separate `DamageApplied` per location because clusters can fan out across multiple locations and the UI animates each. Physicals are mostly single-location (punch / kick / push / DFA target damage is one location), and even charge-clusters are small (2-4 clusters typically). Bundling keeps the physical-event consumer simpler. `DamageApplied` still fires from `resolveDamage` for the actual damage pipeline — the bundled payload on `PhysicalAttackResolved` is a UI affordance, not a replacement.

**Alternative considered:** Emit `PhysicalAttackResolved` (hit/miss only) + `DamageApplied` per cluster, matching weapon attacks exactly. Rejected: forces UI consumers to correlate two event types by attack ID for what is in 90%+ of cases a single damage application. The bundled form costs a few bytes per event and saves the consumer correlation logic.

### Decision 6: Charge and DFA cluster splitting reuses the existing weapon-cluster utility

**Choice:** Tasks 6.4 / 7.4 (5-point clusters for charge/DFA) call the existing `splitIntoClusters(damage, clusterSize=5)` helper from the damage pipeline; do not reimplement.

**Rationale:** The post-`integrate-damage-pipeline` codebase has a canonical cluster splitter used by LRMs, SRMs, AC-burst weapons. Charge target damage is conceptually identical: total damage in 5-point chunks, each chunk rolls hit-location separately. Reusing keeps the damage-application path uniform and means cluster-table erratum updates cascade automatically.

**Alternative considered:** Inline `Math.ceil(damage / 5)` and `damage % 5` arithmetic. Rejected: re-derives logic that's already tested in the pipeline, and misses edge cases like minimum-cluster-of-1 from the proposal note ("min 1 cluster of 5" for low-damage charge — handled correctly in the existing splitter via the floor-then-remainder logic).

### Decision 7: PSR triggers are queue-only; this change does NOT execute the rolls

**Choice:** Resolvers call `pushPSRTrigger(targetId, 'PhysicalAttackTarget')` etc., which adds to the PSR queue owned by `wire-piloting-skill-rolls`. Resolution of those rolls (and the cascade — fall on failure, consciousness check, etc.) happens in the next sub-phase, not here.

**Rationale:** Separation of concerns. `wire-piloting-skill-rolls` is the canonical owner of PSR mechanics; duplicating roll execution here would create two sources of truth and complicate future PSR rule changes (e.g., torso-twist modifiers, MASC failure interaction). The dependency on `wire-piloting-skill-rolls` already being merged (prerequisite 0.4) makes this the only correct order.

**Alternative considered:** Roll PSRs inline within the physical resolver. Rejected: violates the dependency contract from the proposal and creates a circular dependency path for future PSR-rule changes.

## Risks / Trade-offs

- **Risk:** Restriction predicates (3.3–3.7) read from `unit.locations[loc].actuators` and `turnState.unitsThatRanThisTurn` — fields whose exact shape varies across the codebase as Tier-4 entity refactors land. → **Mitigation:** Read shapes from `IBattleMechCombatState` (the post-`integrate-damage-pipeline` canonical), not from raw construction-state types. Add a single adapter helper if a needed field is missing rather than inlining accessor logic in five places.

- **Risk:** Bot decision logic (task 11.3) "no friendlier option" check could lead to bots punching weak targets while a charge or DFA would end the game. → **Mitigation:** Out of scope for this change — task 11.3 explicitly defers DFA/charge to Lane C. Documented as a known limitation in the bot test (11.5) so a follow-up retreat/aggression spec can extend the heuristic without rewriting it.

- **Risk:** Event-stream replay determinism (task 12.5) breaks if any resolver reads `Math.random()` instead of the injected `SeededRandom`. → **Mitigation:** Lint rule + code review — the existing `no-direct-random` ESLint rule (post `fix-combat-rule-accuracy`) catches this. Add explicit test asserting two runs with the same seed produce byte-identical event arrays.

- **Risk:** Charge "miss with commitment-to-destination" rule (proposal Rule Sources note for charge) — attacker still enters the target hex on miss; both sides still take collision PSRs; no damage. This is subtle and easy to miss. → **Mitigation:** Spec's "Charge miss queues PSR" scenario doesn't currently capture the displacement-on-miss behavior. The implementer SHALL add a scenario covering it, OR file a clarifying note in the spec before implementation. Cross-checked against archived `full-combat-parity` Phase 7.

- **Trade-off:** Bundling damage payload into `PhysicalAttackResolved` (Decision 5) deviates slightly from the weapon-attack event shape. → **Accepted:** Documented in the spec's event-emission section so consumers know the payloads differ. The simplification is worth the asymmetry given physical attacks are 90%+ single-location.

- **Trade-off:** No human-driven UI for declarations in this change (Non-Goal). Hot-seat play in `InteractiveSession` will work for AI vs AI but not human-vs-AI for the physical phase until Lane B4 ships. → **Accepted:** The `IPhysicalAttackDeclaration` event is a stable contract Lane B4 can subscribe to without re-architecting the engine.

## Migration Plan

1. **Land restriction predicates first** (tasks 3.3–3.7). They are pure functions with isolated tests; landing them ahead of the phase-body wiring lets task 1.3 (validation step) be a one-liner that calls the validator.
2. **Land charge/DFA cluster splitting** (tasks 6.4, 7.4) and push displacement (tasks 8.3, 8.5). These complete the per-attack-type resolvers so the resolution loop has nothing left to special-case.
3. **Wire the phase body** (tasks 1.1–1.6). With resolvers and validator green, the phase reduces to a 30-line switch over declaration types.
4. **Add `BotPlayer.playPhysicalAttackPhase`** (tasks 11.1–11.4). Bot driver is independent of the phase body but consumed by it; add after the phase body so the integration test (11.5) has a real phase to drive.
5. **Bot integration tests** (11.5–11.6) and replay tests (12.5).
6. **Final validation** (13.1 strict validate, 13.4 DFA hit test, 13.6 build/lint).

**Rollback strategy:** The phase body change is a single switch-case. Reverting `GameEngine.phases.ts` to the empty `advancePhase()` call disables physicals cleanly without leaving dangling state — declarations live in the turn record only and are GC'd when the turn ends. All resolver / validator / table modules are pure and harmless if unreferenced.

## Resolved Questions

The four open questions from earlier drafts were closed against MegaMek's authoritative
implementation. Citations point to the upstream Java repo cloned at
`E:/Projects/megamek` (commit-of-record: whatever the working tree had on
2026-04-24).

### Resolved 1: Charge miss displaces attacker to a SIDE hex, not the target hex

**Source:** `megamek/src/megamek/server/totalWarfare/TWGameManager.java:14047-14058`
calls `Compute.getMissedChargeDisplacement(game, ae.getId(), src, direction)` and
then `doEntityDisplacement(ae, src, dest, null)`.
`megamek/src/megamek/common/compute/Compute.java:1116-1158` shows
`getMissedChargeDisplacement` picks the hex at `(direction + 1) % 6` or
`(direction + 5) % 6` from the attacker's PRE-MOVE position — i.e., one of the
two hexes 60° off the charge direction — preferring the higher-elevation choice
and falling back to a d6 random pick on ties. **The attacker does NOT enter the
target hex on miss.** That part of the proposal text was incorrect.

**Decision:** The implementer SHALL use a port of `getMissedChargeDisplacement`
semantics: on miss, displace the attacker to the side hex
(`(facing + 1) % 6` or `(facing + 5) % 6` from the attacker's last legal pre-charge
position), preferring the higher-elevation hex; on tie, the seeded RNG picks.
If neither side hex is a valid displacement target (off-map, blocked), the
attacker stays at the source hex (Compute.java:1155-1156). Both sides still
queue PSRs (collision PSR on attacker via `MissedCharge`; target PSR is NOT
queued on miss because no contact occurs).

**Spec impact:** The `physical-attack-system` delta needs a NEW scenario covering
"Charge miss displaces attacker to side hex" because the existing "Charge miss
queues PSR" scenario only covers the PSR side of the rule. See spec edit below.

### Resolved 2: Lance damage is NOT doubled in MegaMek's charge resolver — the "doubled when charging" rule is unimplemented in MegaMek and we follow MegaMek

**Source:** `megamek/src/megamek/common/actions/ClubAttackAction.java:112-218`
`getDamageFor` uses the default branch (`floor(weight / 5)`) for `S_LANCE`
clubs — no separate "isCharging" multiplier. A grep across `megamek/src/megamek`
for `lance.*charge|charge.*lance` returns zero matches. The Total Warfare /
TacOps "lance damage doubled when charging" rule is **not** implemented in
MegaMek's source — likely because (a) MegaMek treats charge and club as
separate actions per turn and (b) the actual TW p.150 text is about *lance
weapons replacing the charge damage formula*, which MegaMek elects not to
implement to avoid the rules-edge dispute about which formula wins.

**Decision:** Lance damage in this change is `floor(attacker.weight / 5)` as a
**club attack only**, matching MegaMek's `ClubAttackAction.getDamageFor`. We
do NOT add a charge-doubling multiplier to the lance club resolver. If a
declarer wants charge-style damage with a lance, they declare a Charge attack
(separate action), which uses the standard charge damage formula
`ceil(attacker.weight / 10) × (hexesMoved - 1)` regardless of carried clubs.
The tasks.md entry 9.4 ("Lance: damage = floor(weight / 5), doubled when
charging") is therefore restated as: `floor(weight / 5)` for the lance club
attack; charging is a separate declaration with its own damage path.

**Spec impact:** `physical-weapons-system` already defines lance damage as
`floor(weight / 5)`; this resolution simply confirms there is no charge
multiplier to add. Tasks.md item 9.4 will be reworded during apply-phase to
drop the "doubled when charging" clause.

### Resolved 3: Push displacement uses `Coords.translated(facing: int 0-5)` plus `isValidDisplacement(game, entityId, position, direction)` — facing is an integer 0-5, not a vector

**Source:** `megamek/src/megamek/common/actions/PushAttackAction.java:246`
checks the target is in front of the attacker via
`ae.getPosition().translated(ae.getFacing())`.
`megamek/src/megamek/server/totalWarfare/TWGameManager.java:13452-13460`
resolves a successful push: `int direction = ae.getFacing(); Coords src =
te.getPosition(); Coords dest = src.translated(direction);` then
`Compute.isValidDisplacement(game, te.getId(), te.getPosition(), direction)`.
Identical pattern is used for charge miss displacement
(`Compute.java:1147-1153`).

**Decision:** The MekStation port SHALL expose displacement via two helpers
already shipped with `wire-firing-arc-resolution`: `translateHex(coords, facing)`
and `isValidDisplacement(state, entityId, coords, facing)`. The `facing`
parameter is an integer 0-5 (matching MegaMek's hex-direction encoding); no
vector type is needed. Push resolver semantics: on hit, compute
`dest = translateHex(target.position, attacker.facing)`; if
`isValidDisplacement(state, target.id, target.position, attacker.facing)` is
false (off-map / blocked), the push **fails** but the target still takes a
fall-style PSR (TWGameManager.java:13460-13510 mirrors this with the "no valid
displacement" branch).

**Spec impact:** The existing "Push into invalid hex" scenario already covers
this. No new scenario needed; the implementer's reference is the helper names
above.

### Resolved 4: Bot iterates enemies as a sorted array (by `unitId` ascending), never a `Set`; ties in `selectTarget` ALSO break by `unitId` after the random tie-break to lock determinism end-to-end

**Source:** Existing `BotPlayer.playPhysicalAttackPhase` (already merged
under `wire-bot-ai-helpers-and-capstone`) at
`E:/Projects/MekStation/src/simulation/ai/BotPlayer.ts:335-403` already takes
`targets: readonly IAIUnitState[]` (an array, not a Set). The risk lives in
upstream callers that may build the array from a `Set<IAIUnitState>` or from
`Object.values()` — both have implementation-defined iteration order in
edge cases. `AttackAI.selectTarget` at
`E:/Projects/MekStation/src/simulation/ai/AttackAI.ts:249-279` sorts by score
desc but breaks ties via `random.nextInt(tied.length)` over the array order —
so two callers passing the same scored set in different orders pick different
targets.

**Decision:** Adopt **array + sort by `unitId`** as the canonical
deterministic-input convention for the physical-attack phase, applied at TWO
chokepoints:

1. **Phase entry** — `GameEngine.phases.ts` SHALL build the bot-driven
   declaration list by iterating `Object.values(state.units)` then
   `.sort((a, b) => a.unitId.localeCompare(b.unitId))` BEFORE calling
   `BotPlayer.playPhysicalAttackPhase` per attacker. Same convention applies
   to the `targets` array passed into the bot driver.
2. **Tie-break in `selectTarget`** — extend the existing "highest score wins;
   ties broken by random" logic to a triple key:
   `(score desc, then unitId asc, then random.nextInt(tied.length) over the
   stable-sorted ties)`. The random consumption rate stays constant (one
   `nextInt` per call), preserving the regression contract documented in
   `AttackAI.ts:264-269`.

**Why not a Map keyed by ID:** A Map keyed by `unitId` has well-defined
insertion-order iteration in JS, but insertion order is set by upstream code
we don't fully control (event replay, save/load). Sorting by `unitId` at the
chokepoint is robust against any upstream ordering and adds O(n log n) once
per phase, which is negligible (n < 24 typically).

**Spec impact:** This is an implementation-level convention, not a SHALL
requirement that the spec needs to enforce. It is documented here in design.md
so reviewers can spot violations during apply-phase code review. No spec edit
needed.

## Open Questions

(none — all four prior questions resolved against MegaMek upstream above)
