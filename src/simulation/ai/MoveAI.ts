import type {
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, FiringArc, MovementType } from '@/types/gameplay';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { getHex, isInBounds, isOccupied } from '@/utils/gameplay/hexGrid';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import {
  calculateGroundPathMpCost,
  calculateMovementHeat,
  findPath,
  getFacingChangeCost,
  getMaxMP,
  type IMovementCostContext,
  type UnitMovementType,
} from '@/utils/gameplay/movement';
import { terrainTagOffersCover } from '@/utils/gameplay/terrainCover';

import type { SeededRandom } from '../core/SeededRandom';
import type { IElectronicWarfareContext } from './AIElectronicWarfareAdvisor';
import type { ObjectiveRole } from './AIObjectivePlanner';
import type { IAIPath } from './AITerrainPathfinder';
import type {
  IAITierAdvancedParameters,
  IAITierCoordinationParameters,
  IAITierMovementParameters,
  IAITierObjectiveParameters,
} from './AITierRegistry';
import type { IVisionContext } from './AIVisionAdvisor';
import type { IAIUnitState, IBotBehavior, IMove } from './types';

import { adviseDestination as adviseEcmDestination } from './AIElectronicWarfareAdvisor';
import { findAllPaths } from './AITerrainPathfinder';
import {
  resolveAdvancedParameters,
  resolveCoordinationParameters,
  resolveObjectiveParameters,
  resolveTierParameters,
} from './AITierRegistry';
import { adviseDestination as adviseVisionDestination } from './AIVisionAdvisor';
import { scoreRetreatMove } from './RetreatAI';

/**
 * Per `wire-bot-ai-helpers-and-capstone`: facing → unit axial vector.
 * Used for the "ending facing toward edge" check when scoring retreat
 * moves. Flat-top hex orientation matching the engine's `Facing` enum.
 */
const FACING_VECTORS: Record<Facing, IHexCoordinate> = {
  [Facing.North]: { q: 0, r: -1 },
  [Facing.Northeast]: { q: 1, r: -1 },
  [Facing.Southeast]: { q: 1, r: 0 },
  [Facing.South]: { q: 0, r: 1 },
  [Facing.Southwest]: { q: -1, r: 1 },
  [Facing.Northwest]: { q: -1, r: 0 },
};

/**
 * Per `wire-bot-ai-helpers-and-capstone`: convert one of the 4 retreat
 * edges to its axial unit vector. Used both for distance-to-edge and
 * facing-alignment checks.
 */
function edgeVector(edge: 'north' | 'south' | 'east' | 'west'): IHexCoordinate {
  switch (edge) {
    case 'north':
      return { q: 0, r: -1 };
    case 'south':
      return { q: 0, r: 1 };
    case 'east':
      return { q: 1, r: 0 };
    case 'west':
      return { q: -1, r: 0 };
  }
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: distance from a hex to a
 * map edge using axial Chebyshev convention. North = max -r, South =
 * max +r, East = max +q, West = max -q. Uses the same `mapRadius`
 * convention as `RetreatAI.resolveEdge`.
 *
 * NOTE: `RetreatAI.resolveEdge` treats positive r as "south" — we
 * preserve that convention here so the edge picked at trigger time
 * remains the closer one as the unit moves.
 */
function distanceToEdge(
  position: IHexCoordinate,
  edge: 'north' | 'south' | 'east' | 'west',
  mapRadius: number,
): number {
  switch (edge) {
    case 'north':
      // `resolveEdge` defines dNorth = mapRadius - position.r.
      return mapRadius - position.r;
    case 'south':
      return position.r - -mapRadius;
    case 'east':
      return mapRadius - position.q;
    case 'west':
      return position.q - -mapRadius;
  }
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: returns true when the unit's
 * `endingFacing` vector points toward `edge` (within ±60° — i.e., the
 * facing's axial vector and the edge's axial vector both have the
 * same sign on the dominant axis). Pure helper.
 */
function endingFacingTowardEdge(
  endingFacing: Facing,
  edge: 'north' | 'south' | 'east' | 'west',
): boolean {
  const facingVec = FACING_VECTORS[endingFacing];
  const edgeVec = edgeVector(edge);
  // Dot product on axial coords gives a rough alignment score; >= 1 is
  // "facing is generally toward the edge". The 6 facings produce dot
  // products of {-1, 0, 1}, so >= 1 captures the 2-3 facings closest
  // to the edge direction.
  return facingVec.q * edgeVec.q + facingVec.r * edgeVec.r >= 1;
}

/**
 * Per `improve-bot-basic-combat-competence` task 6.1–6.4: context
 * passed to `scoreMove` for combat-time movement scoring. Pulling this
 * into its own interface keeps the scorer pure and testable without
 * constructing a full `BotPlayer` harness.
 *
 *   - `attacker` is the unit being moved (used for facing/arc math).
 *   - `allUnits` is the full bot-visible unit list; we filter to
 *     non-destroyed enemies inside the scorer.
 *   - `grid` is needed for `calculateLOS` terrain blocking.
 *   - `highestThreatTarget` is optional — when supplied we give +500
 *     if the target ends up in the attacker's forward arc after the
 *     move. When omitted we skip the forward-arc bonus entirely
 *     (legacy callers that haven't migrated).
 *
 * Per `add-ai-terrain-aware-movement` design D5, two more optional fields
 * carry the terrain-aware scoring inputs:
 *
 *   - `tierMovement` is the active difficulty tier's movement parameter
 *     block. When omitted, or when its `pathfinderEnabled` flag is `false`,
 *     `scoreMove` runs the legacy straight-line scorer and the three new
 *     terrain-aware terms contribute nothing — output is byte-identical to
 *     the pre-change scorer.
 *   - `pathByDestination` maps a destination's canonical `"q,r"` key to the
 *     `IAIPath` the terrain-cost pathfinder found for it. `scoreMove` reads
 *     the path for `move.destination` to compute the terrain-cost
 *     efficiency term. Populated once per turn by `selectMove`.
 */
export interface IScoreMoveContext {
  readonly attacker: IAIUnitState;
  readonly allUnits: readonly IAIUnitState[];
  readonly grid: IHexGrid;
  readonly highestThreatTarget?: IAIUnitState;
  /**
   * Per `add-ai-terrain-aware-movement` design D6: the unit's movement
   * capability, supplied so `selectMove` can run the terrain-cost
   * pathfinder. Optional — when omitted, `selectMove` derives a best-effort
   * MP budget from the candidate move set's largest `mpCost`.
   */
  readonly capability?: IMovementCapability;
  readonly tierMovement?: IAITierMovementParameters;
  readonly pathByDestination?: ReadonlyMap<string, IAIPath>;

  /**
   * Per `add-ai-coordination-tactics` design D3 / D4: the active difficulty
   * tier's coordination parameter block. When omitted, or when its
   * `lanceCoordination` flag is `false` (the `Green` / `Regular` / `Veteran`
   * tiers, and every legacy caller), `scoreMove`'s cohesion term contributes
   * zero and the score is byte-identical to the A1/A2 terrain-aware scorer.
   */
  readonly tierCoordination?: IAITierCoordinationParameters;
  /**
   * Per `add-ai-coordination-tactics` design D3: the rounded centroid of the
   * friendly lance, from `AILancePlanner`. The cohesion term penalizes a
   * destination beyond `cohesionRadius` hexes of this point. Omitted for
   * per-unit (non-coordinated) callers.
   */
  readonly lanceCentroid?: IHexCoordinate;
  /**
   * Per `add-ai-coordination-tactics` design D3: the moving unit's friendly
   * lancemates (excluding the unit itself). Used by the lone-advance penalty
   * — a destination that enters enemy line of sight while no lancemate is
   * within `cohesionRadius` is penalized as advancing alone. Omitted for
   * per-unit callers.
   */
  readonly lancemates?: readonly IAIUnitState[];

  /**
   * Per `add-ai-objective-awareness` design D3: the active difficulty tier's
   * objective-awareness parameter block. When omitted, or when its
   * `objectiveAwareness` flag is `false` (the `Green` / `Regular` / `Veteran`
   * tiers, and every legacy caller), `scoreMove`'s objective term contributes
   * zero and the score is byte-identical to the A1/A2/A3a scorer.
   */
  readonly tierObjective?: IAITierObjectiveParameters;
  /**
   * Per `add-ai-objective-awareness` design D3: the moving unit's objective
   * role from the lance plan's objective layer. `'capture'` rewards closing
   * on the objective hex; `'hold'` rewards staying on it; `'screen'` (and an
   * absent role) leave the objective term at zero. Omitted for callers
   * without an objective plan.
   */
  readonly objectiveRole?: ObjectiveRole;
  /**
   * Per `add-ai-objective-awareness` design D3: the hex the moving unit is
   * working toward (`capture`) or holding (`hold`). The objective term
   * scores `move.destination` against this hex. Omitted for screen-role
   * units and callers without an objective plan.
   */
  readonly objectiveHex?: IHexCoordinate;

  /**
   * Per `add-ai-advanced-systems` design D4: the active difficulty tier's
   * advanced-systems parameter block. When omitted, or when its
   * `advancedSystems` flag is `false` (the `Green` / `Regular` / `Veteran`
   * tiers, and every legacy caller), `scoreMove`'s three advanced terms —
   * jump tactics, ECM advice, vision advice — contribute zero and the score
   * is byte-identical to the A1/A2/A3a/A3b scorer.
   */
  readonly tierAdvanced?: IAITierAdvancedParameters;
  /**
   * Per `add-ai-advanced-systems` design D1 / D4: the net tactical score of
   * the moving unit's best jump destination, from `AIJumpTactics.evaluateJump`.
   * `scoreMove` adds it (scaled by `jumpTacticsWeight`) ONLY to jump moves —
   * a jump destination is purposeful only when the unit jumped to reach it.
   * Omitted for non-advanced tiers and callers that did not evaluate jumps.
   */
  readonly jumpEvaluationScore?: number;
  /**
   * Per `add-ai-advanced-systems` design D2: the electronic-warfare context
   * — the moving unit's team id, the live EW snapshot, and its lancemates.
   * `scoreMove` runs `AIElectronicWarfareAdvisor.adviseDestination` per
   * candidate destination. Omitted when no EW state is threaded (the term
   * stays inert).
   */
  readonly electronicWarfare?: IElectronicWarfareContext;
  /**
   * Per `add-ai-advanced-systems` design D3: the vision context — the grid,
   * the enemy set, and the moving unit's lancemates. `scoreMove` runs
   * `AIVisionAdvisor.adviseDestination` per candidate destination. Omitted
   * when no vision context is threaded (the term stays inert).
   */
  readonly vision?: IVisionContext;
}

/**
 * Per `add-ai-terrain-aware-movement` design D5 (cover term): whether a hex
 * offers partial cover or better.
 *
 * The destination hex's terrain tag (`IHex.terrain`) is narrowed to a known
 * `TerrainType` and its `coverLevel` consulted — any level other than `None`
 * (partial OR full) counts. A missing hex or unrecognised terrain yields
 * `false`. Mirrors `getTerrainCoverLevel` from the rendering layer without
 * importing it.
 */
function destinationOffersCover(
  grid: IHexGrid,
  destination: IHexCoordinate,
): boolean {
  const hex = getHex(grid, destination);
  if (!hex) return false;
  return terrainTagOffersCover(hex.terrain);
}

/**
 * Per `improve-bot-basic-combat-competence` task 6: score a candidate
 * non-retreat move. Higher = better.
 *
 * Scoring terms (additive):
 *   - `+1000` if at least one non-destroyed enemy has line of sight
 *     to the destination hex (task 6.2). We score the destination,
 *     not the path — the bot cares about where it ENDS, not
 *     intermediate squares.
 *   - `+500` if `highestThreatTarget` is in the resulting FRONT arc
 *     (task 6.3), where "front" uses the move's `facing` as the
 *     attacker's new facing. Torso twist is NOT applied here — the
 *     movement phase commits the unit's body facing, which is what
 *     the weapon-arc resolver keys off.
 *   - `-100` per hex of distance from the nearest non-destroyed
 *     enemy (task 6.4) — discourages backing off. When no enemies
 *     exist, this term is 0.
 *   - `-1` per point of `move.heatGenerated` (task 6.4) — modest
 *     penalty so running/jumping for no combat reason loses to
 *     walking / standing.
 *
 * Pure function — never mutates inputs. Identical ctx + move => same
 * score, matching the determinism contract for the AI module.
 */
export function scoreMove(move: IMove, ctx: IScoreMoveContext): number {
  const { attacker, allUnits, grid, highestThreatTarget } = ctx;
  let score = 0;

  // Task 6.2: LoS bonus. Uses `calculateLOS`, which already accounts
  // for terrain blocking (intervening woods, buildings, elevation).
  // We look for ANY enemy with LoS — having multiple doesn't
  // compound the score; we only need the bot to be visible to
  // something so it can be shot at (which means it can also shoot).
  const livingEnemies = allUnits.filter(
    (u) => !u.destroyed && u.unitId !== attacker.unitId,
  );
  const anyEnemyHasLOS = livingEnemies.some((enemy) => {
    const los = calculateLOS(enemy.position, move.destination, grid);
    return los.hasLOS;
  });
  if (anyEnemyHasLOS) score += 1000;

  // Task 6.3: forward-arc bonus. Uses `determineArc` with the
  // ATTACKER as the observer — "is the target in front of the new
  // attacker facing?" — the same primitive `AttackAI.selectWeapons`
  // uses for weapon filtering. We apply no torso twist here: the
  // movement phase commits the body's forward facing, and downstream
  // twist is a separate phase-time adjustment.
  if (highestThreatTarget && !highestThreatTarget.destroyed) {
    const arcResult = determineArc(
      {
        unitId: attacker.unitId,
        coord: move.destination,
        facing: move.facing,
        prone: false,
      },
      highestThreatTarget.position,
    );
    if (arcResult.arc === FiringArc.Front) score += 500;
  }

  // Task 6.4a: nearest-enemy distance penalty. Bot should close
  // distance rather than back off. `-100` per hex to the nearest
  // living enemy. Zero enemies => no penalty (nothing to close on).
  if (livingEnemies.length > 0) {
    let nearestDistance = Infinity;
    for (const enemy of livingEnemies) {
      const d = hexDistance(move.destination, enemy.position);
      if (d < nearestDistance) nearestDistance = d;
    }
    score -= 100 * nearestDistance;
  }

  // Task 6.4b: movement-heat penalty. Small so it only breaks ties
  // among otherwise-equivalent moves (a running move that gains a
  // forward-arc bonus easily outweighs the run's heat cost).
  score -= move.heatGenerated;

  // Per `add-ai-terrain-aware-movement` design D5: three additive
  // terrain-aware terms, applied ONLY when the active difficulty tier
  // enables the pathfinder. When `tierMovement` is absent or
  // `pathfinderEnabled` is `false` (the `Green` / `Regular` tiers, and
  // every legacy caller), none of the three terms run and `score` above
  // is byte-identical to the pre-change scorer.
  score += terrainAwareScore(move, ctx);

  // Per `add-ai-coordination-tactics` design D3: the formation-cohesion term.
  // Additive over the terrain-aware terms. Returns `0` whenever lance
  // coordination is disabled (`Green` / `Regular` / `Veteran`, every legacy
  // caller), so the score above is unchanged for those tiers.
  score += cohesionScore(move, ctx);

  // Per `add-ai-objective-awareness` design D3: the objective-seeking /
  // objective-holding term. Additive over the cohesion term. Returns `0`
  // whenever objective awareness is disabled (every non-`Elite` tier and
  // legacy caller) or the unit has no objective role, so the score above is
  // unchanged for those tiers.
  score += objectiveScore(move, ctx);

  // Per `add-ai-advanced-systems` design D4: the jump-tactics, ECM-advice,
  // and vision-advice terms. Additive over the objective term. Returns `0`
  // whenever advanced systems are disabled (every non-`Elite` tier and
  // legacy caller), so the score above is unchanged for those tiers.
  score += advancedScore(move, ctx);

  return score;
}

/**
 * Per `add-ai-advanced-systems` design D4: the three advanced-systems
 * scoring terms, summed. Gated on `advancedSystems` — returns `0` for every
 * non-`Elite` tier and every legacy caller, so the caller's A1/A2/A3a/A3b
 * score is preserved exactly.
 *
 *   - Jump-tactics term — `+jumpTacticsWeight * jumpEvaluationScore`, applied
 *     ONLY to jump moves. The jump evaluation (terrain-clearing, elevation,
 *     charge escape, heat safety) is precomputed once per turn by the caller
 *     via `AIJumpTactics.evaluateJump`; `scoreMove` only weights it. A
 *     non-jump move never receives the jump term — a walk destination is not
 *     a jump.
 *   - ECM-advice term — `ecmCoverageWeight * coverageBonus -
 *     ecmAvoidanceWeight * hostileBubblePenalty`, from
 *     `AIElectronicWarfareAdvisor.adviseDestination`. A destination inside a
 *     hostile ECM bubble is penalized; an ECM/probe carrier covering the
 *     lance is rewarded.
 *   - Vision-advice term — `visionWeight * (scoutBonus + losBreakBonus)`,
 *     from `AIVisionAdvisor.adviseDestination`. A destination that newly
 *     spots an enemy or breaks an enemy's spotting line is rewarded.
 *
 * Pure — never mutates inputs, consumes no `SeededRandom`. The advisors only
 * read EW / fog-of-war state; they never touch combat resolution.
 */
function advancedScore(move: IMove, ctx: IScoreMoveContext): number {
  const { tierAdvanced } = ctx;

  // Gate: non-advanced tiers and every legacy caller resolve to a no-op.
  if (!tierAdvanced || !tierAdvanced.advancedSystems) {
    return 0;
  }

  let delta = 0;

  // Jump-tactics term — jump moves only. The score is precomputed for the
  // unit's best jump destination; here it biases the choice of Jump moves
  // among the candidate set. `MoveAI.selectMove` already restricts the
  // candidate set to a single movement type per call, so applying the term
  // to every jump move in the set is consistent — it lifts jump candidates
  // uniformly versus the (separate-call) walk/run candidates.
  if (
    move.movementType === MovementType.Jump &&
    tierAdvanced.jumpTacticsWeight !== 0 &&
    ctx.jumpEvaluationScore !== undefined
  ) {
    delta += tierAdvanced.jumpTacticsWeight * ctx.jumpEvaluationScore;
  }

  // ECM-advice term — penalize a destination inside a hostile ECM bubble,
  // reward an ECM/probe carrier that covers the lance or counters enemy ECM.
  if (
    ctx.electronicWarfare &&
    (tierAdvanced.ecmAvoidanceWeight !== 0 ||
      tierAdvanced.ecmCoverageWeight !== 0)
  ) {
    const advice = adviseEcmDestination(
      ctx.attacker,
      move.destination,
      ctx.electronicWarfare,
    );
    delta += tierAdvanced.ecmCoverageWeight * advice.coverageBonus;
    delta -= tierAdvanced.ecmAvoidanceWeight * advice.hostileBubblePenalty;
  }

  // Vision-advice term — reward scouting an unspotted enemy and breaking an
  // enemy's spotting line to the moving unit.
  if (ctx.vision && tierAdvanced.visionWeight !== 0) {
    const advice = adviseVisionDestination(
      ctx.attacker,
      move.destination,
      ctx.vision,
    );
    delta +=
      tierAdvanced.visionWeight * (advice.scoutBonus + advice.losBreakBonus);
  }

  return delta;
}

/**
 * Per `add-ai-objective-awareness` design D3: the objective movement term,
 * gated on `objectiveAwareness`.
 *
 *   - Capture role — `+objectiveSeekingWeight` per hex of distance reduced
 *     toward the `take` marker (origin distance minus destination distance),
 *     so closing on the objective outscores backing off, plus a large flat
 *     on-marker bonus (`objectiveSeekingWeight * ON_MARKER_BONUS_HEXES`) for
 *     a destination *on* the marker hex so the unit commits to standing on
 *     it once in reach.
 *   - Hold role — `+objectiveHoldWeight` for a destination on the `hold`
 *     marker, `objectiveHoldWeight * ADJACENT_HOLD_FRACTION` for a
 *     destination adjacent to it (engage from cover near the marker), and
 *     `0` for any destination that abandons the marker — so staying planted
 *     always outscores chasing an enemy off the objective.
 *   - Screen role (and an absent role) — contributes `0`; the unit plays
 *     pure A1/A2/A3a movement.
 *
 * Returns `0` when `tierObjective` is absent, `objectiveAwareness` is
 * `false`, no `objectiveHex` is supplied, or the role is `screen` — the
 * score is byte-identical to the A3a scorer for every non-`Elite` tier and
 * every screen-role unit.
 *
 * Pure — never mutates inputs, consumes no `SeededRandom`.
 */
function objectiveScore(move: IMove, ctx: IScoreMoveContext): number {
  const { tierObjective, objectiveRole, objectiveHex, attacker } = ctx;

  // Gate: non-objective-aware tiers, every legacy caller, and screen-role
  // units resolve to a no-op.
  if (!tierObjective || !tierObjective.objectiveAwareness) {
    return 0;
  }
  if (!objectiveRole || objectiveRole === 'screen') {
    return 0;
  }
  if (!objectiveHex) {
    return 0;
  }

  const destDistance = hexDistance(move.destination, objectiveHex);

  if (objectiveRole === 'capture') {
    const { objectiveSeekingWeight } = tierObjective;
    if (objectiveSeekingWeight === 0) return 0;
    // A destination on the marker earns a large flat bonus so the unit
    // commits to standing on the objective once it can reach it.
    if (destDistance === 0) {
      return objectiveSeekingWeight * ON_MARKER_BONUS_HEXES;
    }
    // Otherwise reward the reduction in distance toward the marker — the
    // closer the destination is than the unit's current hex, the higher the
    // term. A destination that backs away pays a negative term.
    const originDistance = hexDistance(attacker.position, objectiveHex);
    return objectiveSeekingWeight * (originDistance - destDistance);
  }

  // Hold role.
  const { objectiveHoldWeight } = tierObjective;
  if (objectiveHoldWeight === 0) return 0;
  // On the marker — full hold weight; the unit keeps control.
  if (destDistance === 0) {
    return objectiveHoldWeight;
  }
  // Adjacent to the marker — a reduced reward; the unit stays close enough
  // to re-take the hex while using nearby cover, but a destination ON the
  // marker still scores strictly higher.
  if (destDistance === 1) {
    return objectiveHoldWeight * ADJACENT_HOLD_FRACTION;
  }
  // Any destination that abandons the marker forfeits the whole term —
  // chasing an enemy off the objective is never rewarded.
  return 0;
}

/**
 * Per `add-ai-objective-awareness` design D3: the on-marker capture bonus is
 * `objectiveSeekingWeight` multiplied by this hex count. Sized so it dwarfs
 * the per-hex distance-reduction reward — a unit one hex away that *could*
 * step onto the marker always prefers the on-marker hex over a closer-but-
 * off-marker destination.
 */
const ON_MARKER_BONUS_HEXES = 20;

/**
 * Per `add-ai-objective-awareness` design D3: a hold-role unit on a hex
 * adjacent to its marker earns this fraction of the full hold weight — close
 * enough to re-take the objective and use nearby cover, but strictly below
 * the on-marker score so the unit prefers to stand on the objective itself.
 */
const ADJACENT_HOLD_FRACTION = 0.5;

/**
 * Per `add-ai-coordination-tactics` design D3: the formation-cohesion
 * scoring term, gated on `lanceCoordination`.
 *
 *   - Centroid pull — when the destination sits beyond `cohesionRadius` of
 *     the lance centroid, a penalty of `-cohesionWeight * (distance -
 *     cohesionRadius)` scales by how far past the radius it lies. A
 *     destination inside the radius pays nothing.
 *   - Lone-advance penalty — an additional `-cohesionWeight` when the
 *     destination enters at least one enemy's line of sight while *no*
 *     lancemate is within `cohesionRadius` of it. Advancing alone into a
 *     kill-box is discouraged; advancing with the lance is not.
 *
 * Returns `0` when `tierCoordination` is absent or `lanceCoordination` is
 * `false`, or when `cohesionWeight` is `0` — the score is byte-identical to
 * the A1/A2 scorer for every non-`Elite` tier.
 *
 * Pure — never mutates inputs, consumes no `SeededRandom`.
 */
function cohesionScore(move: IMove, ctx: IScoreMoveContext): number {
  const { tierCoordination, lanceCentroid, grid, allUnits, attacker } = ctx;

  // Gate: non-coordinated tiers and every legacy caller resolve to a no-op.
  if (
    !tierCoordination ||
    !tierCoordination.lanceCoordination ||
    tierCoordination.cohesionWeight === 0
  ) {
    return 0;
  }
  // Without a centroid there is no formation to hold to — no penalty.
  if (!lanceCentroid) {
    return 0;
  }

  const { cohesionRadius, cohesionWeight } = tierCoordination;
  let delta = 0;

  // Centroid pull — penalize a destination that drifts past the radius.
  const centroidDistance = hexDistance(move.destination, lanceCentroid);
  if (centroidDistance > cohesionRadius) {
    delta -= cohesionWeight * (centroidDistance - cohesionRadius);
  }

  // Lone-advance penalty — entering enemy LOS with no lancemate close by.
  const lancemates = ctx.lancemates ?? [];
  const livingEnemies = allUnits.filter(
    (u) => !u.destroyed && u.unitId !== attacker.unitId,
  );
  const destInEnemyLOS = livingEnemies.some((enemy) => {
    // A lancemate is never an enemy — exclude friendly units from the LOS
    // probe. `lancemates` carries the friendly ids.
    if (lancemates.some((m) => m.unitId === enemy.unitId)) return false;
    return calculateLOS(enemy.position, move.destination, grid).hasLOS;
  });
  if (destInEnemyLOS) {
    const hasNearbyLancemate = lancemates.some(
      (mate) =>
        !mate.destroyed &&
        hexDistance(mate.position, move.destination) <= cohesionRadius,
    );
    if (!hasNearbyLancemate) {
      delta -= cohesionWeight;
    }
  }

  return delta;
}

/**
 * Per `add-ai-terrain-aware-movement` design D5: the three terrain-aware
 * scoring terms, summed. Returns `0` whenever the pathfinder is disabled so
 * the caller's legacy score is preserved exactly.
 *
 *   - Cover term — `+coverWeight` when the destination hex offers partial
 *     cover or better.
 *   - LOS-denial term — `+losDenialWeight` when the destination breaks the
 *     highest-threat enemy's line of sight (only when a threat target is
 *     supplied).
 *   - Terrain-cost term — `-terrainCostWeight * (pathMpCost - hexDistance)`
 *     so a destination reached by a wasteful path scores below an
 *     equivalent destination reached cheaply. `pathMpCost` comes from the
 *     terrain-cost pathfinder's `IAIPath` for the destination; when no path
 *     was supplied (or the destination is the origin) the term is `0`.
 *
 * Pure — never mutates inputs.
 */
function terrainAwareScore(move: IMove, ctx: IScoreMoveContext): number {
  const { grid, highestThreatTarget, tierMovement, pathByDestination } = ctx;

  // Gate: the legacy tiers (`Green` / `Regular`) and every caller that does
  // not thread a tier through resolve here to a no-op.
  if (!tierMovement || !tierMovement.pathfinderEnabled) {
    return 0;
  }

  let delta = 0;

  // Cover term — reward ending in partial-or-better cover.
  if (
    tierMovement.coverWeight !== 0 &&
    destinationOffersCover(grid, move.destination)
  ) {
    delta += tierMovement.coverWeight;
  }

  // LOS-denial term — reward a destination the highest-threat enemy can no
  // longer see. `calculateLOS` already accounts for terrain blocking; a
  // destination that breaks the threat's LOS is one the bot can shelter on.
  if (
    tierMovement.losDenialWeight !== 0 &&
    highestThreatTarget &&
    !highestThreatTarget.destroyed
  ) {
    const threatLOS = calculateLOS(
      highestThreatTarget.position,
      move.destination,
      grid,
    );
    if (!threatLOS.hasLOS) {
      delta += tierMovement.losDenialWeight;
    }
  }

  // Terrain-cost term — penalize paths whose MP cost exceeds the straight
  // hex distance from origin to destination (a wasteful route, whether
  // because it detours around obstacles or claws through costly terrain).
  // Per design D5 the penalty scales by `pathMpCost - hexDistance`. A path
  // whose cost equals the straight-line distance pays nothing; a
  // cheaper-than-distance path cannot occur (every hex costs >= 1), so the
  // clamp at `> 0` is a safety net, never a bonus.
  if (tierMovement.terrainCostWeight !== 0 && pathByDestination) {
    const path = pathByDestination.get(coordToKey(move.destination));
    if (path) {
      const straightLine = hexDistance(ctx.attacker.position, move.destination);
      const inefficiency = path.totalMpCost - straightLine;
      if (inefficiency > 0) {
        delta -= tierMovement.terrainCostWeight * inefficiency;
      }
    }
  }

  return delta;
}

function calculateMoveCandidateMpCost(params: {
  readonly grid: IHexGrid;
  readonly path: readonly IHexCoordinate[] | null;
  readonly position: IUnitPosition;
  readonly destination: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly movementContext?: IMovementCostContext;
}): number {
  const {
    grid,
    path,
    position,
    destination,
    facing,
    movementType,
    movementContext,
  } = params;
  const distance = hexDistance(position.coord, destination);

  if (distance === 0) {
    return getFacingChangeCost(position.facing, facing);
  }

  if (movementType === MovementType.Jump) {
    return distance;
  }

  if (!path) {
    return Infinity;
  }

  return calculateGroundPathMpCost(
    grid,
    path,
    toGroundUnitMovementType(movementType),
    position.facing,
    facing,
    movementContext,
  );
}

function toGroundUnitMovementType(
  movementType: MovementType,
): UnitMovementType {
  return isRunBasedMovement(movementType) ? 'run' : 'walk';
}

function isRunBasedMovement(movementType: MovementType): boolean {
  return (
    movementType === MovementType.Run ||
    movementType === MovementType.Evade ||
    movementType === MovementType.Sprint
  );
}

export class MoveAI {
  constructor(private readonly behavior: IBotBehavior) {}

  getValidMoves(
    grid: IHexGrid,
    position: IUnitPosition,
    movementType: MovementType,
    capability: IMovementCapability,
    movementContext?: IMovementCostContext,
  ): readonly IMove[] {
    const maxMP = getMaxMP(capability, movementType);
    const destinations = enumerateMovementCandidateDestinations(
      position.coord,
      maxMP,
    );
    const moves: IMove[] = [];

    for (const destination of destinations) {
      if (!isInBounds(grid, destination)) continue;
      const distance = hexDistance(position.coord, destination);
      if (distance > 0 && isOccupied(grid, destination)) continue;

      const path =
        movementType !== MovementType.Jump && distance > 0
          ? findPath(
              grid,
              position.coord,
              destination,
              Infinity,
              toGroundUnitMovementType(movementType),
              movementContext,
            )
          : null;
      if (movementType !== MovementType.Jump && distance > 0 && !path) {
        continue;
      }

      for (let facing = 0; facing < 6; facing++) {
        const typedFacing = facing as Facing;
        const mpCost = calculateMoveCandidateMpCost({
          grid,
          path,
          position,
          destination,
          facing: typedFacing,
          movementType,
          movementContext,
        });

        if (mpCost > maxMP) continue;

        moves.push({
          destination,
          facing: typedFacing,
          movementType,
          mpCost,
          heatGenerated: calculateMovementHeat(
            movementType,
            distance,
            capability.partialWingJumpBonus,
          ),
        });
      }
    }

    return moves;
  }

  /**
   * Per `wire-bot-ai-helpers-and-capstone` + `improve-bot-basic-combat-competence`:
   *
   *   1. If `unit.isRetreating` and `unit.retreatTargetEdge` are set, use
   *      the retreat scoring path (unchanged from the retreat change).
   *   2. Else if a combat context (`ctx`) is supplied, score moves with
   *      `scoreMove` and pick the highest (tasks 6/7). Ties broken by
   *      `SeededRandom.nextInt` so determinism is preserved across runs
   *      sharing a seed.
   *   3. Else (legacy callers) fall back to uniform random pick. Kept
   *      so existing tests and the simulation runner can migrate in
   *      steps rather than all at once.
   *
   * Random consumption is CONSTANT per call regardless of which branch
   * runs — retreat always calls `nextInt(bestMoves.length)` (even on
   * length 1), combat always calls `nextInt(bestMoves.length)`, and
   * the legacy path calls `nextInt(moves.length)`. This keeps
   * downstream `SimulationRunner` seed sequences stable across the
   * AI upgrades. (Fixes the same class of determinism regression as
   * `AttackAI.selectTarget`.)
   */
  selectMove(
    moves: readonly IMove[],
    random: SeededRandom,
    unit?: IAIUnitState,
    ctx?: IScoreMoveContext,
  ): IMove | null {
    if (moves.length === 0) {
      return null;
    }

    // Retreat scoring path — only when fully wired (unit + edge).
    if (unit?.isRetreating && unit.retreatTargetEdge) {
      const edge = unit.retreatTargetEdge;
      // mapRadius isn't on IAIUnitState — we infer it from the grid by
      // checking the largest |q|+|r| in the grid via the moves'
      // destinations (cheap upper bound). Falls back to the unit's own
      // hex distance to origin when the move set is small.
      const mapRadius = inferMapRadiusFromMoves(moves, unit.position);
      const previousDistance = distanceToEdge(unit.position, edge, mapRadius);

      let bestScore = -Infinity;
      let bestMoves: IMove[] = [];
      for (const move of moves) {
        const newDistance = distanceToEdge(move.destination, edge, mapRadius);
        const score = scoreRetreatMove({
          previousDistanceToEdge: previousDistance,
          newDistanceToEdge: newDistance,
          endingFacingTowardEdge: endingFacingTowardEdge(move.facing, edge),
          isJumpMove: move.movementType === MovementType.Jump,
        });
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }

      const idx = random.nextInt(bestMoves.length);
      return bestMoves[idx];
    }

    // Task 7.1: combat scoring path. Only runs when the caller
    // supplies a context (enemy list + grid). Highest score wins,
    // ties broken by random.
    if (ctx) {
      // Per `add-ai-terrain-aware-movement` design D3 / D6: resolve the
      // bot's difficulty tier and, when its pathfinder is enabled, run a
      // SINGLE terrain-cost Dijkstra pass up front. `scoreMove` then reads
      // each destination's cheapest path from the returned map — no
      // per-move search. When the tier disables the pathfinder (`Green` /
      // `Regular`, the legacy tiers), `scoreMove` receives the same ctx it
      // always did and produces byte-identical scores.
      const scoringCtx = this.enrichScoreContext(ctx, moves);

      let bestScore = -Infinity;
      let bestMoves: IMove[] = [];
      for (const move of moves) {
        const score = scoreMove(move, scoringCtx);
        if (score > bestScore) {
          bestScore = score;
          bestMoves = [move];
        } else if (score === bestScore) {
          bestMoves.push(move);
        }
      }
      const idx = random.nextInt(bestMoves.length);
      return bestMoves[idx];
    }

    const index = random.nextInt(moves.length);
    return moves[index];
  }

  /**
   * Per `add-ai-terrain-aware-movement` design D3 / D6: enrich a combat
   * `IScoreMoveContext` with the active difficulty tier's movement
   * parameters and — when that tier enables the pathfinder — the cheapest
   * terrain-cost path to every candidate destination.
   *
   * The bot's tier comes from `this.behavior.tier`; an absent tier resolves
   * to `Regular` (the legacy-scorer tier). For `Green` / `Regular` the tier
   * has `pathfinderEnabled: false`, so this returns the context with only
   * `tierMovement` attached and `scoreMove` produces byte-identical scores
   * to the pre-change scorer.
   *
   * When the pathfinder is enabled, `findAllPaths` runs ONCE here — a single
   * Dijkstra sweep shared across every candidate move — and the resulting
   * path map is attached as `pathByDestination`. The movement type is read
   * off the candidate moves (all moves in one `selectMove` call share it);
   * the MP budget comes from `ctx.capability` when supplied, otherwise from
   * the largest `mpCost` in the move set.
   *
   * Pure with respect to RNG — consumes no `SeededRandom`.
   */
  private enrichScoreContext(
    ctx: IScoreMoveContext,
    moves: readonly IMove[],
  ): IScoreMoveContext {
    const tierParams = resolveTierParameters(this.behavior.tier);
    const tierMovement = tierParams.movement;
    // Per `add-ai-coordination-tactics` design D3: attach the coordination
    // block too. `scoreMove`'s cohesion term gates on `lanceCoordination`,
    // so for `Green` / `Regular` / `Veteran` (and a `ctx` carrying no lance
    // centroid) this contributes nothing — the score stays byte-identical.
    const tierCoordination = resolveCoordinationParameters(tierParams);
    // Per `add-ai-objective-awareness` design D3: attach the objective block.
    // `scoreMove`'s objective term gates on `objectiveAwareness` and the
    // caller-supplied `objectiveRole`, so for every non-`Elite` tier (and a
    // `ctx` carrying no objective role) this contributes nothing — the score
    // stays byte-identical.
    const tierObjective = resolveObjectiveParameters(tierParams);
    // Per `add-ai-advanced-systems` design D4: attach the advanced block.
    // `scoreMove`'s three advanced terms gate on `advancedSystems`, so for
    // every non-`Elite` tier (and a `ctx` carrying no jump/ECM/vision data)
    // this contributes nothing — the score stays byte-identical.
    const tierAdvanced = resolveAdvancedParameters(tierParams);

    // Legacy tiers: attach the (no-op) tier blocks only. `scoreMove` gates
    // every terrain-aware term on `pathfinderEnabled`, the cohesion term on
    // `lanceCoordination`, the objective term on `objectiveAwareness`, and
    // the advanced terms on `advancedSystems`, so this is byte-identical to
    // pre-change behavior for the non-pathfinder tiers.
    if (!tierMovement.pathfinderEnabled) {
      return {
        ...ctx,
        tierMovement,
        tierCoordination,
        tierObjective,
        tierAdvanced,
      };
    }

    // Determine the shared movement type and MP budget for the pathfinder
    // sweep. `moves` is non-empty here (the caller guards `length === 0`).
    const movementType = moves[0].movementType;
    const capability = ctx.capability ?? deriveCapability(moves, movementType);

    const pathByDestination = findAllPaths(
      ctx.grid,
      ctx.attacker.position,
      movementType,
      capability,
    );

    return {
      ...ctx,
      tierMovement,
      tierCoordination,
      tierObjective,
      tierAdvanced,
      pathByDestination,
    };
  }
}

/**
 * Per `add-ai-terrain-aware-movement` design D6: best-effort
 * `IMovementCapability` reconstructed from a candidate move set when the
 * caller did not thread the real capability through `IScoreMoveContext`.
 *
 * `findAllPaths` consults the capability only for the MP budget of the
 * active movement type, so we set just that field to the largest `mpCost`
 * present in the move set (the move generator already capped destinations to
 * the unit's true reach). The other two MP fields are filled with the same
 * value — harmless, since only the active type's field is read.
 */
function deriveCapability(
  moves: readonly IMove[],
  movementType: MovementType,
): IMovementCapability {
  let maxMp = 0;
  for (const move of moves) {
    if (move.mpCost > maxMp) maxMp = move.mpCost;
  }
  return {
    walkMP: movementType === MovementType.Walk ? maxMp : 0,
    runMP: isRunBasedMovement(movementType) ? maxMp : 0,
    jumpMP: movementType === MovementType.Jump ? maxMp : 0,
  };
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: cheap mapRadius estimate
 * from a candidate move set. Returns the largest |q| or |r| seen in
 * any destination or the unit's current position. Sufficient for
 * scoring within the move-set since `scoreRetreatMove` cares about
 * RELATIVE progress, not absolute coordinates.
 */
function inferMapRadiusFromMoves(
  moves: readonly IMove[],
  origin: IHexCoordinate,
): number {
  let radius = Math.max(Math.abs(origin.q), Math.abs(origin.r));
  for (const move of moves) {
    radius = Math.max(
      radius,
      Math.abs(move.destination.q),
      Math.abs(move.destination.r),
    );
  }
  return radius;
}

function enumerateMovementCandidateDestinations(
  origin: IHexCoordinate,
  maxMP: number,
): readonly IHexCoordinate[] {
  const destinations: IHexCoordinate[] = [];

  for (let dq = -maxMP; dq <= maxMP; dq++) {
    for (let dr = -maxMP; dr <= maxMP; dr++) {
      destinations.push({
        q: origin.q + dq,
        r: origin.r + dr,
      });
    }
  }

  return destinations;
}

/**
 * Per-change test hook for `improve-bot-basic-combat-competence`:
 * re-export internal helpers so unit tests can pin the retreat math
 * without standing up a full `MoveAI` instance. Not part of the public
 * surface.
 */
export const __testing__ = {
  FACING_VECTORS,
  distanceToEdge,
  edgeVector,
  endingFacingTowardEdge,
  enumerateMovementCandidateDestinations,
  inferMapRadiusFromMoves,
};
