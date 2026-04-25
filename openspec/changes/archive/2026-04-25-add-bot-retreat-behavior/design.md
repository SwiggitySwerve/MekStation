# Design: Add Bot Retreat Behavior

## Context

`IBotBehavior` already exposes `retreatThreshold: number` (default `0.5`) and `retreatEdge: 'north' | 'south' | 'east' | 'west' | 'nearest' | 'none'` fields, but the AI decision layer never reads them. As a result, crippled bots fight to the death, which produces unrealistic matches and drags out late-game state when one side has clearly lost. The companion change `improve-bot-basic-combat-competence` (C1) just landed shared threat scoring, firing-arc filtering, heat management, and `SeededRandom` discipline that this change reuses, and `integrate-damage-pipeline` (A4) already routes structural-damage and through-armor critical events through the engine — so the data needed for retreat triggers is observable today.

Retreat is a per-unit state that mutates AI behavior across three phases (movement, attack, end-of-turn). It must be deterministic (same game state → same retreat decisions, ties broken via `SeededRandom`), sticky (once triggered, locked for the match), and observable (emit `UnitRetreated` so the post-battle summary can distinguish withdrawal from destruction).

## Goals / Non-Goals

**Goals:**

- Wire existing `IBotBehavior.retreatThreshold` and `retreatEdge` fields into `BotPlayer` decision-making.
- Crippled bots disengage toward a map edge and exit the match cleanly via `UnitRetreated`.
- Retreat is fully deterministic and reproducible from a seeded match replay.
- Reuse existing `MoveAI` / `AttackAI` infrastructure — no new AI subsystems, just retreat-aware overrides.
- Allow the post-battle summary (separate spec) to distinguish "withdrawn" from "destroyed".

**Non-Goals:**

- Player-driven retreat UI (humans disengage by not moving).
- Coordinated team-wide retreat or morale propagation.
- Re-entry after edge exit — a retreated unit is gone for the rest of the match.
- Healing / restoration mid-match — Phase 1 has no repair pipeline.
- Retreat for non-bot players or campaign-layer concessions.

## Decisions

### D1. Retreat state lives on `IAIUnitState`, not on the unit JSON

Retreat is a per-match runtime decision, not a unit property. Adding `isRetreating: boolean` and `retreatTargetEdge: 'north' | 'south' | 'east' | 'west' | null` to `IAIUnitState` keeps the canonical unit JSON immutable and lets the session reducer rebuild retreat state from the event log on replay. Alternative considered: storing retreat state on `IBotBehavior` itself — rejected because `IBotBehavior` is a config object, not a runtime state container.

### D2. `RetreatAI.ts` module hosts the trigger + edge-resolution logic

Trigger evaluation (`shouldRetreat`) and edge resolution (`resolveEdge`) are pure functions of game state. Putting them in a dedicated `src/simulation/ai/RetreatAI.ts` keeps `BotPlayer` thin and makes the trigger logic individually testable without spinning up a full session. `BotPlayer.playMovementPhase` calls `RetreatAI.evaluate(unit, behavior, gameState)` once per turn at the top of the movement phase, before `MoveAI` runs. Alternative considered: inlining into `BotPlayer` — rejected because the trigger needs to consult both the structural-damage state AND the event log for through-armor crits, and that conditional logic deserves its own home.

### D3. Retreat triggers are sticky via `IAIUnitState`, not via event re-derivation

Once `isRetreating` is set, it is not re-evaluated downward. `RetreatAI.evaluate` is called every turn, but it short-circuits to a no-op if `unit.isRetreating === true` already. This avoids edge cases where a derived value (e.g., a healing event in a future Phase) would otherwise un-trigger retreat. The sticky-trigger pattern matches how MegaMek's `BotForcedWithdrawal` works.

### D4. Through-armor crit detection scans `CriticalHitApplied` event log filtered by location

Rather than maintaining a separate "has-been-critted" flag on `IAIUnitState`, the trigger queries the existing event stream for `CriticalHitApplied` events targeting cockpit/gyro/engine on this unit. This keeps retreat state derivable from the canonical event log (essential for replay) and avoids a new bookkeeping field. Alternative considered: per-unit `criticalHits: Set<Location>` — rejected because it duplicates information already in the event log and would need to stay in sync on rollback/replay.

### D5. `MoveAI` retreat scoring is an override, not a separate scoring path

`MoveAI.scoreMove` already returns a numeric score. When `attacker.isRetreating === true`, it short-circuits to a retreat-specific scoring formula that ignores threat/LOS/firing-arc terms. The retreat formula is:

```typescript
const progressBonus = 1000 * (distanceBefore - distanceAfter);
const facingBonus = forwardArcPointsTowardEdge ? 200 : 0;
const jumpPenalty = move.movementType === MovementType.Jump ? -50 : 0;
return progressBonus + facingBonus + jumpPenalty;
```

The `+1000` weight on progress dominates so any forward step beats any backward step. The `+200` facing bonus tiebreaks moves with equal progress. The `-50` jump penalty makes Run always strictly preferred when a Run move with equal progress exists. Ties remaining after these terms break via the existing `SeededRandom` path used in `MoveAI.pickBestMove`. Alternative considered: composing retreat weights into the existing scoring formula — rejected because retreat fundamentally inverts which terms matter (LOS becomes harmful, edge distance dominates), and a clean override is easier to reason about.

### D6. Distance metric is Chebyshev (max of |dx|, |dy|), not axial hex distance

The proposal text uses "Chebyshev distance" for edge resolution. On a hex grid with offset coordinates, "distance to a map edge" is the minimum offset-row or offset-column count to reach that edge — which collapses to Chebyshev semantics regardless of hex axial details (it's a 1-D distance to a line, not a 2-D hex distance). `BattleGrid.distanceToEdge(hex, edge): number` returns this directly. The same metric is used for nearest-edge resolution and for move-progress scoring, so they stay consistent.

### D7. `selectMovementType` override: Run > Walk, never Jump

When `unit.isRetreating === true`:

- Return `MovementType.Run` if `capability.runMP > 0`.
- Else return `MovementType.Walk` (even if `walkMP === 0`, yielding a zero-progress turn — preferable to jumping into shutdown range).
- Never return `MovementType.Jump`.

This matches the spec's "fire weapons whose mount arc aligns with forward-retreat facing" because Run preserves a single forward facing per turn (Jump can flip facing post-jump in BattleTech rules).

### D8. Attack-phase changes are minimally invasive: heat-threshold subtraction + arc filter

`AttackAI.declareAttacks` already accepts `safeHeatThreshold` from the caller. Wrap the call so retreating units pass `Math.max(0, behavior.safeHeatThreshold - 2)`. The arc-filter change reuses the existing firing-arc helper from C1: when retreating, `weapon.mountArc` must intersect `unit.facing` (no torso twist). Physical attacks are simply skipped via an early return in `BotPlayer.declarePhysicalAttacks` when `unit.isRetreating === true`.

### D9. `UnitRetreated` event is emitted alongside `MovementDeclared`, not in a separate phase

When `BotPlayer.playMovementPhase` resolves a move whose destination hex satisfies `grid.isEdgeHex(destination, retreatTargetEdge)`, both `MovementDeclared` (the standard movement event) AND `UnitRetreated` are pushed to the event stream in that turn, in that order. The session reducer treats `UnitRetreated` as analogous to `UnitDestroyed` for victory-check purposes (the unit no longer counts toward its side's remaining total) but tags it with a `cause: 'retreat'` discriminator so the post-battle summary can distinguish withdrawal from combat loss.

### D10. Type contracts

```typescript
// src/simulation/ai/types.ts
interface IAIUnitState {
  // ...existing fields
  readonly isRetreating: boolean;
  readonly retreatTargetEdge: 'north' | 'south' | 'east' | 'west' | null;
}

// src/simulation/ai/RetreatAI.ts
export function shouldRetreat(
  unit: IAIUnitState,
  behavior: IBotBehavior,
  gameState: IGameState,
): boolean;

export function resolveEdge(
  behavior: IBotBehavior,
  unit: IAIUnitState,
  grid: IBattleGrid,
): 'north' | 'south' | 'east' | 'west' | null;

export function evaluate(
  unit: IAIUnitState,
  behavior: IBotBehavior,
  gameState: IGameState,
  grid: IBattleGrid,
): { isRetreating: boolean; retreatTargetEdge: 'north' | 'south' | 'east' | 'west' | null };

// src/engine/events.ts
GameEventType.UnitRetreated = 'UnitRetreated';

interface IUnitRetreatedPayload {
  readonly unitId: string;
  readonly retreatEdge: 'north' | 'south' | 'east' | 'west';
  readonly turn: number;
}
```

## Risks / Trade-offs

- **[Risk] Through-armor crit log scan is O(events × turns)** → Mitigation: scan once per turn at the top of the movement phase and cache the result on `IAIUnitState` via the sticky `isRetreating` flag. The scan only runs while `isRetreating === false`.
- **[Risk] Retreat lock survives even if an enemy moves between the unit and its locked edge** → Mitigation: this is intentional per spec ("locked edge survives subsequent moves" scenario). Bots may pathfind around blocking enemies at Run MP. Pathfinding around blockers is delegated to existing `MoveAI` candidate generation; the retreat scoring just picks the best progress-toward-edge move from whatever candidates exist.
- **[Risk] Immobilized retreating unit could deadlock the turn loop** → Mitigation: spec scenario "Immobilized retreating unit stays in place without error" — `playMovementPhase` returns `null` cleanly, attack phase proceeds with reduced-heat firing, no `UnitRetreated` is emitted until the unit actually moves onto an edge hex.
- **[Risk] `retreatEdge: 'nearest'` resolution at trigger-time may pick a sub-optimal edge if the threat picture changes** → Mitigation: spec mandates lock-at-trigger-time. Re-resolving every turn would create flip-flop behavior. The trade-off favors deterministic predictability over tactical optimality.
- **[Risk] Tied edge distances during `'nearest'` resolution** → Mitigation: deterministic tiebreaker order north > east > south > west, no `SeededRandom` involvement (so two replays from the same seed always pick the same edge).
- **[Risk] Heat-threshold reduction by 2 may be too aggressive on already-cool units** → Mitigation: clamped at minimum 0 per spec. A unit with `safeHeatThreshold: 1` ends up at 0, firing only zero-heat weapons. This is the intended conservative behavior.
- **[Risk] `UnitRetreated` causes early victory check to fire mid-turn** → Mitigation: victory check already runs at end-of-turn, not per-event. The reducer marks the unit `participating: false` immediately, but the win-check runs once per turn after all event processing. No mid-turn victory is possible.

## Migration Plan

This is a behavior addition with no schema changes and no breaking API changes:

- New fields on `IAIUnitState` default to `false` / `null` — existing bot units serialize and deserialize cleanly.
- New `GameEventType.UnitRetreated` is additive — existing event consumers ignore unknown event types.
- No database migrations.
- No UI changes beyond the existing event log surfacing the new event type (event-log component already renders unknown events with a generic template).
- Rollback strategy: revert the change-set; existing `IBotBehavior.retreatThreshold` / `retreatEdge` fields stay in the type definitions but become unread again. No data corruption risk.

## Resolved Questions

### R1. Through-armor crit detection — scan `ComponentDestroyed` payload by `componentType`

**Resolution:** The trigger scans `session.events` for `GameEventType.ComponentDestroyed` events with `payload.unitId === unit.unitId` and `payload.componentType ∈ {cockpit, engine, gyro}`. We do NOT introduce a new `CriticalHitApplied` event type — the existing `ComponentDestroyed` payload already carries everything required.

**MegaMek alignment:** MegaMek does not maintain a separate "TAC log" either. A through-armor critical is encoded by `HitData.EFFECT_CRITICAL` (`HitData.java:45` — `public static final int EFFECT_CRITICAL = 0x0001`), which is set on the `HitData` object the location-roll layer constructs in `Mek.tac(...)` (`Mek.java:2401-2419`). `TWDamageManager.damageEntity(...)` (`TWDamageManager.java:327-333`) reads `(hit.getEffect() & HitData.EFFECT_CRITICAL) == HitData.EFFECT_CRITICAL` and converts that into one or more crit-slot rolls. Eventually those rolls land on `Mek.isCrippled()` (`Mek.java:5812-5878`) which keys off engine hits, gyro hits, and sensor (cockpit) damage — NOT off a separate "TAC happened" flag. We mirror the same shape: any `ComponentDestroyed` event whose `componentType` lands in our `VITAL_COMPONENT_TYPES` set (`BotPlayer.ts:87`) acts as our crippled-by-vital-crit signal. The implementation is in `computeRetreatSignals` (`BotPlayer.ts:453-475`) which runs once per `evaluateRetreat` call, exactly mirroring the once-per-turn cadence used by Princess.

### R2. Edge-resolution invocation site — top of movement phase, before path enumeration

**Resolution:** `BotPlayer.evaluateRetreat(unit, session)` is called once per unit at the **top of the movement phase**, before path enumeration. The returned `RetreatTriggered` event is appended to the session immediately so that the subsequent `playMovementPhase(unit, ...)` already sees `unit.isRetreating === true` and routes through `selectMovementType` (Run-only) and the retreat scoring branch in `MoveAI.selectMove`.

**MegaMek alignment:** Princess re-evaluates fall-back state at the top of every movement turn via `Princess.calculateMoveTurn(...)` (`Princess.java:2320-2351`): the very first action after `LOGGER.debug("Moving {}", entity)` is to call `isFallingBack(entity)` (`Princess.java:2218-2221`) which composes `behaviorSettings.shouldAutoFlee()` + `behaviorSettings.isForcedWithdrawal() && entity.isCrippled(true)`. If true, Princess immediately decides whether to flee the board (`mustFleeBoard`, `Princess.java:2234-2243`) BEFORE running `getPathRanker(entity).rankPaths(...)`. We mirror this: trigger evaluation runs first, latches the flag, then path enumeration runs with retreat-aware scoring. We do NOT re-evaluate during attack or end phases — the latch is sticky (per `D3` and `R5`).

### R3. Heat threshold + arc filter for attack-phase abort — `safeHeatThreshold − 2` (clamp to 0); torso-twist disabled

**Resolution:** During the attack phase of a retreating unit:

- The effective heat ceiling is `Math.max(0, behavior.safeHeatThreshold − 2)` (`RetreatAI.effectiveSafeHeatThreshold`, `RetreatAI.ts:112-125`). This passes through `applyHeatBudget` in `AttackAI` so weapons that would exceed projected heat are culled rather than firing the weapon.
- Torso twist is forced to `undefined` for retreating units — `AttackAI.selectWeapons` already filters by mounting arc against `attacker.facing + torsoTwist`, so suppressing the twist is sufficient to forbid backward shots.
- Physical attacks are skipped via early return in `BotPlayer.playPhysicalAttackPhase` when `attacker.isRetreating === true` (currently the early-return guard is missing — apply wave must add it).

**MegaMek alignment:** Princess does NOT use a numeric "heat threshold" knob the way our `safeHeatThreshold` does — its heat treatment is utility-based (`FireControl.calculateUtility`, `FireControl.java:1370-1399`): every overheat point above `overheatTolerance` (= `calcHeatTolerance(shooter)`) subtracts `OVERHEAT_DISUTILITY` from the firing-plan utility. The closest behavioral analogue to "be more cautious about heat while retreating" is Princess's "peaceful forced withdrawal" branch in `Princess.calculateFiringTurn` (`Princess.java:951-968`) and `Princess.calculatePhysicalTurn` (`Princess.java:2184-2194`): if `getForcedWithdrawal() && shooter.isCrippled()` AND the unit has not been fired on, **firing is skipped entirely**. We adopt a softer rule (fire with a tighter threshold) because our spec wants retreating units to suppress fire to cover their escape, not go silent. The arc-filter rule (no torso twist) corresponds to Princess's `wantsToFallBack` path, which routes through `getPathRanker(entity).distanceToHomeEdge(...)` (`Princess.java:2238-2240`) — Princess's path ranker, not its fire-control, is what reorients the body so subsequent fire is naturally forward-facing. We get the same effect by suppressing the twist.

### R4. Set iteration determinism — fixed-order array, NOT `Set` or `Map` iteration

**Resolution:** All iteration over edge candidates uses a fixed-order array literal in canonical order: `[north, east, south, west]` (`RetreatAI.resolveEdge`, `RetreatAI.ts:72-79`). The sort is `Array.prototype.sort` with a numeric comparator, which JavaScript guarantees to be stable in all V8 / SpiderMonkey / JSC versions we target (ES2019+). For `VITAL_COMPONENT_TYPES` we DO use a `Set` (`BotPlayer.ts:87`) but only as a membership check — we never iterate the set, we iterate `session.events` (a deterministic ordered array) and probe membership.

**Rationale:** Replay determinism requires that two runs from the same `SeededRandom` seed produce identical `RetreatTriggered` payloads. Using `Set` or `Map` iteration order anywhere on the hot path (event scan, edge resolution, candidate ranking) would risk subtle drift. The current implementation already complies — this resolution exists to formally lock the choice in the design so future contributors know not to refactor the array literal into `new Set([...])`.

### R5. Pre-existing scaffolding — substantial portion already exists; apply-wave must verify per-task

**Resolution:** Eight retreat-related symbols already ship in `src/`:

| Symbol | Path | Status |
|--------|------|--------|
| `IBotBehavior.retreatThreshold` / `retreatEdge` | `src/simulation/ai/types.ts:32-44` | Present |
| `IAIUnitState.isRetreating` / `retreatTargetEdge` | `src/simulation/ai/types.ts:209-215` | Present (optional fields) |
| `RetreatAI.shouldRetreat` | `src/simulation/ai/RetreatAI.ts:36-45` | Present |
| `RetreatAI.resolveEdge` | `src/simulation/ai/RetreatAI.ts:54-80` | Present |
| `RetreatAI.scoreRetreatMove` | `src/simulation/ai/RetreatAI.ts:95-106` | Present |
| `RetreatAI.effectiveSafeHeatThreshold` | `src/simulation/ai/RetreatAI.ts:112-125` | Present |
| `RetreatAI.retreatMovementType` | `src/simulation/ai/RetreatAI.ts:132-139` | Present |
| `RetreatAI.hasReachedEdge` | `src/simulation/ai/RetreatAI.ts:157-175` | Present |
| `BotPlayer.evaluateRetreat` | `src/simulation/ai/BotPlayer.ts:126-159` | Present |
| `BotPlayer.selectMovementType` retreat branch | `src/simulation/ai/BotPlayer.ts:411-443` | Present |
| `MoveAI` retreat scoring path | `src/simulation/ai/MoveAI.ts:271-289` | Present |
| `GameEventType.RetreatTriggered` / `UnitRetreated` | `src/types/gameplay/GameSessionInterfaces.ts:168, 178` | Present |
| `IRetreatTriggeredPayload` / `IUnitRetreatedPayload` | `src/types/gameplay/GameSessionInterfaces.ts:865, 879` | Present |
| `applyRetreatTriggered` / `applyUnitRetreated` reducers | `src/utils/gameplay/gameState/extendedCombat.ts:259-312` | Present |
| `IUnitGameState.isRetreating` / `retreatTargetEdge` / `hasRetreated` | `src/types/gameplay/GameSessionInterfaces.ts:1238-1250` | Present |

Most of the heavy lifting was done in the previously-archived `wire-bot-ai-helpers-and-capstone` change. The work that remains for this change is the **wiring + edge-emission + per-task tests**, not foundational construction.

## Apply-Wave Note

Fifteen tasks in `tasks.md` are checked `[x]` — but several of those checkmarks reflect helpers already present from `wire-bot-ai-helpers-and-capstone`, NOT new work proven by this change's own test suite. Before relying on a checked task, the apply agent MUST verify the corresponding behavior with at least one new spec/scenario test in `add-bot-retreat-behavior`'s test file.

**Specifically verify:**

- **Task 1.1** (`IAIUnitState` retreat fields) — Present, but optional. Confirm that defaults flow through the session builder (task 1.2 still unchecked).
- **Task 2.1** (`shouldRetreat` helper) — Present in `RetreatAI.ts`. Add a test that wires it through `BotPlayer.evaluateRetreat` end-to-end.
- **Task 2.2** (Trigger A: structural ratio) — Helper signature exists but the **destruction ratio formula** in `computeRetreatSignals` (`BotPlayer.ts:458-461`) currently uses `destroyedLocations.length / totalLocations` — that's a count-of-destroyed-locations ratio, NOT the spec's `sum(startingInternalStructure - currentInternalStructure) / sum(startingInternalStructure)`. **This is a behavior gap.** The apply wave MUST replace it with a true points-of-internal-structure ratio.
- **Task 2.5** (Trigger tests) — Add `'none'` suppression test, cockpit-TAC-at-0%-damage test, structural-only test.
- **Task 3.1–3.4** (Edge resolution) — Helper present and unit-tested in `RetreatAI`. Add behavior tests at the `BotPlayer.evaluateRetreat` boundary.
- **Task 4.2–4.4 + 4.6** (Move scoring weights) — Present in `MoveAI.ts:271-289` and `RetreatAI.scoreRetreatMove`. Add the equal-progress facing-tiebreak and run-vs-jump tests called out in 4.6.
- **Task 6.1** (Heat threshold reduction) — Present. Add test confirming threshold = 11 at base 13.
- **Task 8.1** (Determinism) — Helpers are deterministic, BUT see **R4** above re: `Set` membership vs iteration. Add a replay-equivalence test with a fixed seed to lock the contract.

**Tasks definitively NOT yet implemented (all unchecked):**

- 1.2 (default seeding in session builder)
- 1.3 (default + replay tests)
- 2.3 (TAC scan plumbed through evaluateRetreat — present in code but untested for cockpit/gyro/engine)
- 2.4 (latch + edge lock — reducer present, but per-task test missing)
- 4.1 / 4.5 (override formula path + LoS skip — code exists but per-task test missing)
- 5.1–5.4 (selectMovementType cases — code exists but tests missing)
- 6.2 (arc filter — no code yet, see R3)
- 6.3 (skip physical attacks — early return missing in `playPhysicalAttackPhase`)
- 6.4 / 7.1–7.5 / 8.2–8.5 (event emission, removal, edge cases — most untouched)

## Decisions discovered during execution

### Decision: Structure-points baseline propagated via `IUnitGameState.startingInternalStructure`

**Choice**: Add an optional `startingInternalStructure: Record<string, number>` field on `IUnitGameState`. Seed it from `CompendiumAdapter.adaptUnitFromData` (production path) AND bootstrap it on first damage via `applyDamageApplied` (legacy / fixture path). `BotPlayer.computeRetreatSignals` then computes the spec-mandated `sum(starting - current) / sum(starting)` ratio.

**Rationale**: The spec mandates a points-of-IS ratio but neither tonnage nor a separate "max structure" lived on the engine state. Adding a starting baseline that travels with the unit was the lowest-friction path: callers that have catalog data seed it explicitly; callers that don't get a usable baseline captured at the moment of first damage. Without this, the only computable ratio was 0/0 and the structural trigger would never fire correctly.

**Discovered during**: Tasks 1.2, 2.2, 2.5.

### Decision: `UnitRetreated` emission lives at the engine wiring layer

**Choice**: `BotPlayer.playMovementPhase` continues to return only `MovementDeclared`. `GameEngine.phases.runMovementPhase` AND `InteractiveSession.runAITurn` both invoke `RetreatAI.hasReachedEdge` after `lockMovement(...)` and emit `UnitRetreated` directly via `appendEvent + createUnitRetreatedEvent`.

**Rationale**: `BotPlayer` is intentionally pure — it has no session reference, no game ID, no sequence counter. Pushing event emission into the engine layer keeps `BotPlayer` orthogonal to event infrastructure and mirrors how `RetreatTriggered` is already emitted (the bot returns a payload-only event; the engine wraps and appends it). Both phase drivers (autonomous + interactive) achieve parity by calling the same `hasReachedEdge` helper.

**Discovered during**: Tasks 7.2, 7.3, 8.2, 8.4.

### Decision: `hasRetreated` excludes from victory check; `destroyed` stays false

**Choice**: `applyUnitRetreated` sets `hasRetreated: true` only — does NOT also flip `destroyed: true`. `getSurvivingUnitsForSide` (the victory-check predicate) is updated to filter on `!destroyed && !hasRetreated`, so retreated units don't count toward side totals while staying semantically distinct from combat losses.

**Rationale**: The spec says "treat as destroyed for victory-check purposes but distinguish from combat destruction". Overloading `destroyed` with a sub-discriminator would force every consumer to re-classify; keeping the two flags independent and updating the single victory predicate is cleaner. Post-battle summaries (sibling spec) can render `hasRetreated && !destroyed` as "withdrawn" without ambiguity.

**Discovered during**: Tasks 7.4, 7.5.

### Decision: Arc filter via torso-twist suppression in `playAttackPhase`

**Choice**: When `attacker.isRetreating === true`, `BotPlayer.playAttackPhase` builds a clone with `torsoTwist: undefined` and passes that to `AttackAI.selectWeapons`. The existing arc-filter inside `selectWeapons` keys off `attacker.facing + torsoTwist`, so suppressing the twist forces weapon selection through the unit's true forward facing.

**Rationale**: Single-point intervention — no parallel "filter weapons by retreat" code path needed. The existing arc machinery handles the rear-mount edge case automatically (rear-mounted weapons match a rear target's relative arc regardless of twist), satisfying the spec scenario "rear-mounted weapons cover the escape vector".

**Discovered during**: Tasks 6.2, 6.4.

## Open Questions (Deferred)

- Should the retreat trigger include a "morale" damper that prevents triggering on the very first turn (e.g., a Glass Jaw mech at 0% structure shouldn't retreat before firing once)? Current spec says no — first-turn retreat is valid if structural damage exceeds threshold. Keeping spec as-is for Phase 1.
- Should `UnitRetreated` carry the unit's final hex position for replay rendering? Probably yes, but the spec's payload contract is minimal (`unitId`, `retreatEdge`, `turn`). The `MovementDeclared` event emitted in the same turn already carries the final position, so consumers can correlate. Leaving payload as spec'd unless replay rendering surfaces a need.
- Does the post-battle summary need to know if a retreating unit was killed before reaching the edge (i.e., retreated-but-died-trying)? The spec says no — if combat destroys a retreating unit, it counts as a combat loss, not a withdrawal. The discriminator is which event fired first: `UnitDestroyed` vs `UnitRetreated`. Documenting here for the post-battle summary spec to consume.
