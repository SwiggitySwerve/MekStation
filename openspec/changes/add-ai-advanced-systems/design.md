# Design: Add AI Advanced Systems

## Context

A1–A3b made the bot move over terrain, plan resources, coordinate as a lance, and play the scenario. Three systems the engine already models remain invisible to it. Jump jets: `BotPlayer.selectMovementType` rolls a flat 20% to jump and `MoveAI` scores a jump destination exactly like a walk destination — the bot never jumps *for a reason*. Electronic warfare: `src/utils/gameplay/electronicWarfare/` is a finished module (`isInECMBubble`, `getEnemyECMSources`, `getFriendlyECCMSources`, BAP probe counters, stealth modifiers) the bot never calls. Spotting/vision: `src/lib/multiplayer/server/fogOfWar.ts` computes per-side visibility the bot never reads.

A4 wires these three existing systems into AI awareness — it builds none of them. It registers an advanced parameter block into the AI Difficulty Tier Registry from A1, completing the `Elite` tier. `Green`/`Regular`/`Veteran` leave the block inert.

The council preserved one dissent: A4's ECM "play" may want core-engine to-hit modifiers that may not exist. **A4 is scoped strictly to AI-awareness.** If the engine lacks ECM to-hit modifiers, that is a flagged gap for a later change — A4 does not touch combat resolution.

## Goals / Non-Goals

**Goals:**

- Score jump moves for terrain-clearing, elevation gain, and charge escape, weighed against jump heat via A2's heat planner.
- Make the bot avoid hostile ECM bubbles and position friendly ECM/probe carriers usefully, consuming the existing `electronicWarfare` module.
- Make the bot value scouting unspotted enemies and breaking enemy LOS, consuming the existing `fogOfWar.ts`.
- Register the advanced block into the Tier Registry, additively.

**Non-Goals:**

- Core-engine ECM to-hit modifiers (out of scope, flagged). Building/modifying `electronicWarfare` or `fogOfWar.ts`. Hiding enemies from the bot's planner. C3 networked targeting.

## Decisions

### D1. `AIJumpTactics` — purposeful jump scoring

A pure module scores a jump move's tactical value:

- **terrain-clearing** — a jump destination reached over terrain that would cost heavy MP to walk through earns a bonus (jump ignores intervening terrain cost).
- **elevation gain** — a jump destination at higher elevation than the origin earns a bonus (elevation aids LOS and to-hit).
- **charge/melee escape** — when an enemy is adjacent and threatens a physical attack, a jump that breaks adjacency earns a bonus.

The bonus is offset by jump heat: `AIJumpTactics` calls A2's `AIHeatPlanner.projectHeat` with the jump's heat and rejects (or heavily penalizes) a jump that pushes a shutdown inside the lookahead window. `BotPlayer.selectMovementType` consults `AIJumpTactics` instead of the flat 20% roll: it chooses Jump only when a jump destination's tactical value clears a threshold.

```typescript
interface IJumpEvaluation {
  /** Net tactical score of the best jump destination. */
  readonly bestJumpScore: number;
  /** True when jumping risks a shutdown inside the heat lookahead window. */
  readonly heatUnsafe: boolean;
}

function evaluateJump(
  unit: IAIUnitState,
  grid: IHexGrid,
  capability: IMovementCapability,
  enemies: readonly IAIUnitState[],
): IJumpEvaluation;
```

### D2. `AIElectronicWarfareAdvisor` — ECM positioning

A pure module consumes `src/utils/gameplay/electronicWarfare/` (no modification) and advises move scoring:

- **avoidance** — a destination inside a hostile ECM bubble (`isInECMBubble` against `getEnemyECMSources`) earns `-ecmAvoidanceWeight`. ECM degrades the bot's own electronics (C3, targeting computers, Artemis), so the bot prefers clean hexes.
- **coverage** — when the moving unit carries an ECM suite or BAP probe, a destination whose bubble covers more lancemates, or that counters an enemy ECM source (`getFriendlyECCMSources` / `getProbeECMCounterRange`), earns `+ecmCoverageWeight`.

The advisor reads the electronic-warfare state already on the session; it never writes it and never touches to-hit resolution.

```typescript
interface IElectronicWarfareAdvice {
  /** Penalty for ending inside a hostile ECM bubble (>= 0). */
  readonly hostileBubblePenalty: number;
  /** Bonus for an ECM/probe carrier covering or countering (>= 0). */
  readonly coverageBonus: number;
}
```

### D3. `AIVisionAdvisor` — spotting and LOS

A pure module consumes `src/lib/multiplayer/server/fogOfWar.ts` (no modification) and advises move scoring:

- **scouting** — a destination that newly spots a previously-unspotted enemy earns `+visionWeight` (spotting enables indirect fire and lance awareness).
- **LOS-breaking** — a destination that breaks an enemy's line of sight to the moving unit earns a smaller `+visionWeight` share (this complements A1's LOS-denial term, which uses raw `calculateLOS`; A4's term is fog-of-war-aware — it values denying the *enemy's* spotting).

```typescript
interface IVisionAdvice {
  /** Bonus for scouting a previously-unspotted enemy (>= 0). */
  readonly scoutBonus: number;
  /** Bonus for breaking an enemy's spotting line to this unit (>= 0). */
  readonly losBreakBonus: number;
}
```

### D4. New terms in `scoreMove`

When `advancedSystems` is enabled, `scoreMove` adds three terms, each multiplied by its tier weight: the jump tactical bonus (only on jump moves), the ECM advice (`coverageBonus - hostileBubblePenalty`), and the vision advice (`scoutBonus + losBreakBonus`). All are additive over A1/A3a/A3b's terms. `selectMovementType` gains the jump-tactics gate. When `advancedSystems` is disabled, none of the three apply and `selectMovementType` keeps the flat 20% roll.

### D5. A4 registers an advanced block into the Tier Registry

`AITierRegistry` gains an `advanced` block on `IAITierParameters`:

```typescript
interface IAITierAdvancedParameters {
  readonly advancedSystems: boolean;   // false = ignore jump tactics / ECM / vision
  readonly jumpTacticsWeight: number;
  readonly ecmAvoidanceWeight: number;
  readonly ecmCoverageWeight: number;
  readonly visionWeight: number;
}
```

`Green`/`Regular`/`Veteran` set `advancedSystems: false` with zeroed weights — fully inert; `selectMovementType` keeps the flat 20% jump roll. `Elite` populates the block. This is an ADDED requirement; the movement, resource, coordination, and objective blocks are untouched.

### D6. Determinism

Jump scoring, ECM advice, and vision advice are pure functions of unit/grid/EW/fog state. None consume `SeededRandom` — the existing `selectMove` tie-break does. `selectMovementType`'s jump gate replaces a random roll with a deterministic threshold check, which *removes* a random draw on the `Elite` path; the council determinism contract is preserved by keeping `Green`/`Regular`/`Veteran` on the legacy random roll, so golden traces run on those tiers.

## Risks / Trade-offs

- **[Risk] A4 silently expands into core-engine ECM to-hit modifiers** → Mitigation: A4 modules only *read* electronic-warfare state and advise move scoring; the Non-Goals section and the spec requirements forbid touching combat resolution; a missing engine modifier is a flagged separate change.
- **[Risk] Jump-tactics gate changes random consumption and breaks SimulationRunner determinism** → Mitigation: `Green`/`Regular`/`Veteran` keep the flat 20% roll; golden traces run on those tiers; the deterministic jump gate is asserted only on `Elite`.
- **[Risk] ECM/fog modules have a different coordinate or state shape than the AI surface expects** → Mitigation: the advisor modules adapt at their boundary (pure adapter functions); no change to `electronicWarfare/` or `fogOfWar.ts`.
- **[Risk] Registering an advanced block breaks the all-ADDED rule** → Mitigation: `advanced` is a new optional field; this change ADDs a separate requirement and never modifies A1/A2/A3a/A3b's blocks.

## Migration Plan

Purely additive. `Green`/`Regular`/`Veteran` tiers set `advancedSystems: false`, so the jump/ECM/vision advisors are never consulted, `selectMovementType` keeps the flat 20% jump roll, and every existing bot, the swarm harness, and SimulationRunner golden traces are unaffected until a caller selects `Elite`. A4 consumes `electronicWarfare/` and `fogOfWar.ts` without modifying them. No database migrations — advanced parameters live in the tier registry. Rollback = revert the change-set; the three advisor modules become dead code with no behavior change.

## Open Questions

- The jump-tactics threshold for choosing Jump on `Elite` — proposed: a jump is taken when its best destination's tactical score exceeds the best non-jump destination's score by a tunable margin. Revisit after swarm-harness tuning.
- Whether the vision advisor should also drive indirect-fire target selection (LRM at a spotted-but-not-LOS enemy) — proposed: out of scope for A4; A4 values *gaining* spotting but does not change attack resolution. Candidate follow-on.
