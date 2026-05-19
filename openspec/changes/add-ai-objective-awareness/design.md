# Design: Add AI Objective Awareness

## Context

Wave 1's `add-scenario-objective-engine` supplies the spatial objective system: `IObjectiveMarker` records on a `objectives: Record<HexKey, IObjectiveMarker>` session map, control detection, and `evaluateObjectiveOutcome`. A3a's `AILancePlanner` supplies a per-side per-turn plan with threat aggregation and fire assignments. Neither talks to the other: the bot wins a `Capture` scenario only by accident, defends an objective by chasing the enemy away from it, and never walks the exit edge in a `Breakthrough`.

A3b is the connector. It reads the objective map, classifies each marker by what the bot must do with it, extends A3a's `ILanceTurnPlan` with an objective layer, and adds an objective scoring term so movement and target selection serve the scenario rather than pure attrition. A3b registers an objective parameter block into the AI Difficulty Tier Registry from A1 and is the second half of the `Elite` tier — `Green`/`Regular`/`Veteran` leave it inert and the bot plays `Destroy` only.

## Goals / Non-Goals

**Goals:**

- Read the session's objective map and objective type; classify each marker as take / hold / deny for the bot's side.
- Extend A3a's lance plan with objective role assignments (capture, hold, screen).
- Make movement seek take-objectives and stay on hold-objectives.
- Keep target selection from abandoning an objective the bot must hold or capture.

**Non-Goals:**

- Modifying objective markers, placement, control detection, or victory evaluation — owned by `add-scenario-objective-engine`.
- `Escort`/`Recon` types (the engine defers them), objective-aware retreat, feints/sequencing.

## Decisions

### D1. `AIObjectivePlanner` — read and classify the objective map

A pure module reads `session.objectives` and the scenario objective type and classifies each marker for the bot's side:

- **take** — a marker the bot must control to win (an attacker's `Capture` marker; a `Breakthrough` exit hex).
- **hold** — a marker the bot must keep controlling to win (a defender's `Defend`/`Capture` marker it already holds or owns).
- **deny** — a marker the bot must keep the enemy off (an attacker's marker the bot is defending against capture).

When the objective map is empty the planner classifies the scenario as `Destroy` and produces no objective roles — the bot falls through to pure A3a behavior.

```typescript
type ObjectiveIntent = 'take' | 'hold' | 'deny';

interface IClassifiedObjective {
  readonly marker: IObjectiveMarker;
  readonly intent: ObjectiveIntent;
}

function classifyObjectives(
  session: IGameSession,
  botSide: GameSide,
): readonly IClassifiedObjective[];
```

### D2. Objective layer on the `ILanceTurnPlan`

A3a's `ILanceTurnPlan` gains an optional `objectivePlan` field. `AILancePlanner.planTurn` calls `AIObjectivePlanner` and, when objective awareness is enabled and the scenario is not `Destroy`, assigns each unit an objective role:

- **capture role** — assigned to the unit(s) closest (by A1 pathfinder cost) to a `take` marker.
- **hold role** — assigned to the unit(s) currently on or nearest a `hold` marker.
- **screen role** — every other unit; it plays normal A3a coordinated combat, covering the objective units.

```typescript
type ObjectiveRole = 'capture' | 'hold' | 'screen';

interface IObjectiveLancePlan {
  readonly scenarioType: ScenarioObjectiveType;
  readonly roles: ReadonlyMap<string, ObjectiveRole>;
  /** Per role-bearing unit, the hex it is working toward or holding. */
  readonly targetHexes: ReadonlyMap<string, IHexCoordinate>;
}
```

### D3. Objective term in `scoreMove`

`scoreMove` gains an objective term, multiplied by tier weights:

- For a **capture-role** unit: `+objectiveSeekingWeight` scaled by reduction in pathfinder distance to its `take` marker, with a large bonus for a destination *on* the marker hex.
- For a **hold-role** unit: `+objectiveHoldWeight` for a destination on its `hold` marker, scaled-down for destinations adjacent to it (engage from cover near the marker), and zero for destinations that abandon it.
- For a **screen-role** unit: the objective term contributes zero — it plays pure A3a movement.

The term is additive over A1's terrain-aware and A3a's cohesion terms. A capture unit still values cover and LOS; the objective term tilts the balance toward the marker.

### D4. Objective-aware target discipline

When a unit has a `capture` or `hold` role, `playAttackPhase` constrains target selection: it prefers targets engageable *without leaving the objective hex or its path to it*. The bot fires from the marker rather than chasing an enemy off it. A `screen`-role unit's target selection is unchanged from A3a. This is a bias on top of A3a's fire assignment, not a replacement — a hold unit still focus-fires with the lance, it just will not pursue.

### D5. A3b registers an objective block into the Tier Registry

`AITierRegistry` gains an `objective` block on `IAITierParameters`:

```typescript
interface IAITierObjectiveParameters {
  readonly objectiveAwareness: boolean;   // false = play Destroy only
  readonly objectiveSeekingWeight: number;
  readonly objectiveHoldWeight: number;
}
```

`Green`/`Regular`/`Veteran` set `objectiveAwareness: false` with zeroed weights — the bot ignores the objective map and plays pure attrition. `Elite` populates the block. This is an ADDED requirement; the movement, resource, and coordination blocks are untouched.

### D6. Determinism

Classification, role assignment, and the objective scoring term are pure functions of the objective map and the unit set. Role assignment uses A1's deterministic pathfinder cost with canonical unit-ID tie-breaks — no `SeededRandom` is consumed. Existing per-unit tie-breaks are unchanged, so SimulationRunner seed sequences stay stable.

## Risks / Trade-offs

- **[Risk] A capture unit walks onto an undefended marker and gets focus-fired off it** → Mitigation: screen-role units cover objective units via A3a coordination; the objective term tilts movement but A1's cover/LOS terms still apply, so the capture unit prefers a covered approach.
- **[Risk] A hold unit refuses a strong shot because the target is slightly off-objective** → Mitigation: target discipline is a bias bounded by the objective weights; a target engageable from the marker hex is always preferred, but the unit still fires on the best available in-discipline target.
- **[Risk] Objective map present but objective type is `Destroy`** → Mitigation: `classifyObjectives` keys off the scenario objective type; a `Destroy` scenario yields no roles regardless of stray markers, and the bot plays pure A3a.
- **[Risk] Registering an objective block breaks the all-ADDED rule** → Mitigation: `objective` is a new optional field; this change ADDs a separate requirement and never modifies A1's, A2's, or A3a's.

## Migration Plan

Purely additive. `Green`/`Regular`/`Veteran` tiers set `objectiveAwareness: false`, so the objective planner is never consulted and the bot plays `Destroy` exactly as A3a does — every existing bot, the swarm harness, and SimulationRunner golden traces are unaffected until a caller selects `Elite`. The `objectivePlan` field on `ILanceTurnPlan` is optional; A3a plans without it are unchanged. A3b only *reads* the objective map; it never writes markers, so the objective engine is untouched. No database migrations. Rollback = revert the change-set; `AIObjectivePlanner` becomes dead code with no behavior change.

## Open Questions

- How many units to commit to a `take` marker — proposed: the single closest unit per marker, with screen units covering; revisit if capture units are picked off before reaching the hex.
- Whether a hold unit should ever leave its marker to finish a near-dead enemy (a guaranteed kill that removes the only contester) — proposed: out of scope for A3b; target discipline always keeps the unit on-objective. Revisit after swarm-harness tuning.
