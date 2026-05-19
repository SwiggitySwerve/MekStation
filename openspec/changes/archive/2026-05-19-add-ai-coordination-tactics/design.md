# Design: Add AI Coordination Tactics

## Context

A1 and A2 made each bot unit smart on its own — terrain-aware movement, multi-turn resource planning. But a lance of four smart loners still loses to a lance of four mediocre units that focus-fire and move together. `BotPlayer` decides one unit at a time: `playAttackPhase` scores targets from that unit's view, `playMovementPhase` builds a `highestThreatTarget` from that unit's view, and nothing ties the four decisions together. The result is spread damage (four units chipping four targets, killing none) and a broken formation (one mech sprinting ahead into a kill-box).

A3a adds the lance layer. Once per side per turn, an `AILancePlanner` computes a shared threat picture and a fire-assignment plan; each unit's existing per-unit decision then runs *within* that plan. A3a registers a coordination parameter block into the AI Difficulty Tier Registry from A1 and is the first half of the `Elite` tier. `Green`/`Regular`/`Veteran` leave the block inert (so `Veteran` is exactly A1+A2 depth, per the council decision); `Elite` switches it on.

## Goals / Non-Goals

**Goals:**

- Aggregate enemy threat against the whole friendly lance into one shared ranking.
- Coordinate fire so the lance concentrates damage and finishes targets.
- Keep the lance in formation through a movement cohesion term.
- Run one deterministic per-lance plan that the existing per-unit decisions consume.

**Non-Goals:**

- Objective-aware coordination (A3b), cross-lance/army strategy, jump-jet/ECM spacing (A4).
- Fog-of-war on the bot's view of its *own* side — the planner has full friendly knowledge.

## Decisions

### D1. `AIThreatMap` — lance-wide threat aggregation

A pure module aggregates threat across the lance. For every enemy it sums that enemy's `scoreTarget`-style threat against *each* friendly unit, producing a single ranked threat list shared by the whole lance — not four separate per-unit views. The aggregation reuses A2's threat scoring so the numbers stay consistent with single-unit reasoning.

```typescript
interface IThreatEntry {
  readonly enemyId: string;
  /** Summed threat this enemy poses across all friendly lance units. */
  readonly aggregateThreat: number;
  /** Friendly units that can engage this enemy this turn. */
  readonly engageableBy: readonly string[];
}

function buildThreatMap(
  friendly: readonly IAIUnitState[],
  enemies: readonly IAIUnitState[],
): readonly IThreatEntry[];
```

### D2. `AIFireCoordinator` — focus-fire assignment

A pure module assigns friendly units to targets. The objective is to **finish targets**: it prefers an assignment where the combined expected damage of the units assigned to a target meets or exceeds that target's remaining durability, concentrating fire rather than spreading it. When no target is finishable, it concentrates on the highest-aggregate-threat target the most units can engage. The output is a `Map<friendlyUnitId, targetId>` that `playAttackPhase` consults: a unit's `selectTarget` is biased toward its assigned target, falling back to its own `scoreTarget` pick when the assigned target is out of arc or range.

```typescript
interface IFireAssignment {
  /** friendlyUnitId -> assigned targetId. */
  readonly assignments: ReadonlyMap<string, string>;
  /** Targets the lance's assigned firepower can finish this turn. */
  readonly finishableTargets: readonly string[];
}
```

### D3. Formation cohesion in `scoreMove`

`scoreMove` gains a cohesion term, multiplied by the tier `cohesionWeight`: `-cohesionWeight` scaled by how far the destination sits beyond `cohesionRadius` from the lance centroid, plus an extra penalty when the destination puts the unit into enemy LOS *while no lancemate is within `cohesionRadius`* (advancing alone). A unit inside the radius pays nothing. The term is additive over A1's terrain-aware scoring and A2 is unaffected.

### D4. `AILancePlanner` — one plan per side per turn

`AILancePlanner.planTurn(friendly, enemies)` runs once per side at the start of the turn: it builds the threat map (D1) and the fire assignments (D2), and computes the lance centroid for cohesion (D3). The plan is an immutable value passed into each unit's `playMovementPhase`/`playAttackPhase` call. Per-unit decisions are unchanged in shape — they just read the plan. `BotPlayer` gains an optional lance-context parameter; callers that do not pass it get today's per-unit behavior.

```typescript
interface ILanceTurnPlan {
  readonly threatMap: readonly IThreatEntry[];
  readonly fireAssignment: IFireAssignment;
  readonly lanceCentroid: IHexCoordinate;
}
```

### D5. A3a registers a coordination block into the Tier Registry

`AITierRegistry` gains a `coordination` block on `IAITierParameters`:

```typescript
interface IAITierCoordinationParameters {
  readonly lanceCoordination: boolean; // false = per-unit only
  readonly cohesionRadius: number;     // hexes
  readonly cohesionWeight: number;
  readonly focusFireWeight: number;
}
```

`Green`/`Regular`/`Veteran` set `lanceCoordination: false` with zeroed weights — fully inert; `Veteran` therefore stays exactly A1+A2 depth. `Elite` populates the block. This is an ADDED requirement; A1's and A2's blocks are untouched.

### D6. Determinism

The threat map, fire assignment, centroid, and cohesion term are all pure functions of the unit set. The fire assignment uses a deterministic greedy algorithm with canonical unit-ID ordering for tie-breaks — no `SeededRandom` is consumed inside the planner. The existing per-unit tie-breaks in `selectMove`/`selectTarget` are unchanged, so SimulationRunner seed sequences stay stable.

## Risks / Trade-offs

- **[Risk] Focus-fire over-concentrates and ignores an emerging second threat** → Mitigation: when a target is already finishable by fewer units, the coordinator releases the surplus to the next-ranked threat rather than dog-piling.
- **[Risk] Cohesion pins a unit out of effective range so it never fires** → Mitigation: cohesion is an additive penalty bounded by `cohesionWeight`, not a hard leash; A1's LOS/arc terms can outweigh it when a strong shot is available.
- **[Risk] The lance plan and per-unit decision disagree (assigned target unreachable)** → Mitigation: the assignment is a *bias*, not a mandate; `playAttackPhase` falls back to the unit's own `scoreTarget` pick when the assigned target is out of arc/range.
- **[Risk] Registering a coordination block breaks the all-ADDED rule** → Mitigation: `coordination` is a new optional field; this change ADDs a separate requirement and never modifies A1's or A2's.

## Migration Plan

Purely additive. `Green`/`Regular`/`Veteran` tiers set `lanceCoordination: false`, so the lance planner is never consulted and every existing bot, the swarm harness, and SimulationRunner golden traces are unaffected until a caller selects `Elite`. `BotPlayer`'s new lance-context parameter is optional — callers that do not pass it get today's per-unit behavior. No database migrations — coordination parameters live in the tier registry. Rollback = revert the change-set; the planner modules become dead code with no behavior change.

## Open Questions

- Default `cohesionRadius` for `Elite` — proposed `4` hexes; tight enough to mass fire, loose enough to use terrain. Revisit after swarm-harness tuning.
- Whether the lance plan should also pre-assign retreat order (which unit covers a withdrawal) — proposed: out of scope for A3a; retreat stays per-unit (`add-bot-retreat-behavior`), revisit if coordinated withdrawal is wanted.
