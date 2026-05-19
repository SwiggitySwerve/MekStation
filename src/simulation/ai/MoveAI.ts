import type {
  IHexCoordinate,
  IHexGrid,
  IUnitPosition,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, FiringArc, MovementType } from '@/types/gameplay';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { getHex } from '@/utils/gameplay/hexGrid';
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import {
  getValidDestinations,
  calculateMovementHeat,
} from '@/utils/gameplay/movement';
import { terrainTagOffersCover } from '@/utils/gameplay/terrainCover';

import type { SeededRandom } from '../core/SeededRandom';
import type { IAIPath } from './AITerrainPathfinder';
import type { IAITierMovementParameters } from './AITierRegistry';
import type { IAIUnitState, IBotBehavior, IMove } from './types';

import { findAllPaths } from './AITerrainPathfinder';
import { resolveTierParameters } from './AITierRegistry';
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

  return score;
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

export class MoveAI {
  constructor(private readonly behavior: IBotBehavior) {}

  getValidMoves(
    grid: IHexGrid,
    position: IUnitPosition,
    movementType: MovementType,
    capability: IMovementCapability,
  ): readonly IMove[] {
    const destinations = getValidDestinations(
      grid,
      position,
      movementType,
      capability,
    );
    const moves: IMove[] = [];

    for (const destination of destinations) {
      const distance = hexDistance(position.coord, destination);
      const heatGenerated = calculateMovementHeat(movementType, distance);

      for (let facing = 0; facing < 6; facing++) {
        moves.push({
          destination,
          facing: facing as Facing,
          movementType,
          mpCost: distance,
          heatGenerated,
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
    const tierMovement = resolveTierParameters(this.behavior.tier).movement;

    // Legacy tiers: attach only the (no-op) tier block. `scoreMove` gates
    // every new term on `pathfinderEnabled`, so this is byte-identical to
    // the pre-change behavior.
    if (!tierMovement.pathfinderEnabled) {
      return { ...ctx, tierMovement };
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

    return { ...ctx, tierMovement, pathByDestination };
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
    runMP: movementType === MovementType.Run ? maxMp : 0,
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
  inferMapRadiusFromMoves,
};
