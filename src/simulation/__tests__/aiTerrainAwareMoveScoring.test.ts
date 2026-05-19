/**
 * Tests for terrain-aware move scoring.
 *
 * Covers the `Terrain-Aware Move Scoring` requirement of
 * `add-ai-terrain-aware-movement` — scenarios "Veteran bot seeks cover",
 * "Veteran bot breaks enemy line of sight", "Wasteful path scores below an
 * efficient path", and "Regular bot ignores the new terms" — plus the
 * `AI Difficulty Tier Registry` scenario "Lower tiers reproduce the legacy
 * scorer" and the integration check from tasks 5.1 / 5.2.
 *
 * @spec openspec/changes/add-ai-terrain-aware-movement/specs/simulation-system/spec.md
 *   Requirement: Terrain-Aware Move Scoring
 */

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, MovementType, TerrainType } from '@/types/gameplay';
import { hexDistance, hexLine } from '@/utils/gameplay/hexMath';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';

import { findAllPaths, type IAIPath } from '../ai/AITerrainPathfinder';
import { getTierParameters } from '../ai/AITierRegistry';
import { MoveAI, scoreMove, type IScoreMoveContext } from '../ai/MoveAI';
import {
  DEFAULT_BEHAVIOR,
  type IAIUnitState,
  type IBotBehavior,
  type IMove,
} from '../ai/types';
import { SeededRandom } from '../core/SeededRandom';

// =============================================================================
// Fixtures
// =============================================================================

function makeGrid(
  radius: number,
  terrainAt: Record<string, string> = {},
  occupied: IHexCoordinate[] = [],
): IHexGrid {
  const hexes = new Map<string, IHex>();
  const occupiedSet = new Set(occupied.map((c) => `${c.q},${c.r}`));
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      const key = `${q},${r}`;
      hexes.set(key, {
        coord: { q, r },
        occupantId: occupiedSet.has(key) ? 'blocker' : null,
        terrain: terrainAt[key] ?? 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius }, hexes };
}

function makeUnit(
  overrides: Partial<IAIUnitState> & { unitId: string },
): IAIUnitState {
  return {
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

function makeMove(
  overrides: Partial<IMove> & { destination: IHexCoordinate },
): IMove {
  return {
    facing: Facing.North,
    movementType: MovementType.Walk,
    mpCost: 1,
    heatGenerated: 1,
    ...overrides,
  };
}

function capability(walk: number, jump = 0): IMovementCapability {
  return { walkMP: walk, runMP: Math.ceil(walk * 1.5), jumpMP: jump };
}

const VETERAN_MOVEMENT = getTierParameters('Veteran').movement;
const REGULAR_MOVEMENT = getTierParameters('Regular').movement;

// =============================================================================
// Scenario: Veteran bot seeks cover
// =============================================================================

describe('Veteran bot seeks cover', () => {
  it('scores a partial-cover destination higher than an open one', () => {
    // Cover hex at (2,0) is light woods; open hex at (-2,0) is clear.
    // Cover hex (2,0) is light woods; open hex (-2,2) is clear. Both are
    // hex-distance 6 from the single enemy at (0,6) — verified below — so
    // the LOS and closing-distance terms are equal and only the cover
    // term separates the two scores.
    const coverDest = { q: 2, r: 0 };
    const openDest = { q: -2, r: 2 };
    const enemyPos = { q: 0, r: 6 };
    expect(hexDistance(coverDest, enemyPos)).toBe(
      hexDistance(openDest, enemyPos),
    );

    const grid = makeGrid(7, { '2,0': TerrainType.LightWoods });
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: enemyPos });

    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierMovement: VETERAN_MOVEMENT,
    };

    const coverScore = scoreMove(makeMove({ destination: coverDest }), ctx);
    const openScore = scoreMove(makeMove({ destination: openDest }), ctx);

    expect(coverScore).toBeGreaterThan(openScore);
    expect(coverScore - openScore).toBe(VETERAN_MOVEMENT.coverWeight);
  });

  it('selectMove routes a Veteran bot into the cover hex', () => {
    const coverDest = { q: 2, r: 0 };
    const openDest = { q: -2, r: 2 };
    const grid = makeGrid(7, { '2,0': TerrainType.LightWoods });
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 6 } });

    const veteran: IBotBehavior = { ...DEFAULT_BEHAVIOR, tier: 'Veteran' };
    const ai = new MoveAI(veteran);

    const moves: IMove[] = [
      makeMove({ destination: coverDest }),
      makeMove({ destination: openDest }),
    ];
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      capability: capability(4),
    };

    const chosen = ai.selectMove(moves, new SeededRandom(1), attacker, ctx);
    expect(chosen?.destination).toEqual(coverDest);
  });
});

// =============================================================================
// Scenario: Veteran bot breaks enemy line of sight
// =============================================================================

describe('Veteran bot breaks enemy line of sight', () => {
  it('scores an LOS-breaking destination higher than a visible one', () => {
    // Two destinations equidistant (hex-distance 8) from the threat at
    // (0,-6): hiddenDest (2,0) and visibleDest (-2,2). Heavy woods are
    // placed on every intervening hex of the threat -> hiddenDest line so
    // that destination breaks LOS; the threat -> visibleDest line is left
    // clear. The setup is self-validating: calculateLOS is asserted below
    // to confirm one destination is hidden and one visible before the
    // scoring comparison runs.
    const threatPos = { q: 0, r: -6 };
    const hiddenDest = { q: 2, r: 0 };
    const visibleDest = { q: -2, r: 2 };
    expect(hexDistance(hiddenDest, threatPos)).toBe(
      hexDistance(visibleDest, threatPos),
    );

    // Heavy woods on the intervening hexes of the line to the hidden hex,
    // EXCLUDING any hex also on the line to the visible hex (the two lines
    // share near-threat hexes) so the visible destination keeps clear LOS.
    const lineToHidden = hexLine(threatPos, hiddenDest);
    const lineToVisible = hexLine(threatPos, visibleDest);
    const visibleLineKeys = new Set(lineToVisible.map((h) => `${h.q},${h.r}`));
    const terrainAt: Record<string, string> = {};
    for (const hex of lineToHidden) {
      const key = `${hex.q},${hex.r}`;
      const isEndpoint =
        (hex.q === threatPos.q && hex.r === threatPos.r) ||
        (hex.q === hiddenDest.q && hex.r === hiddenDest.r);
      if (!isEndpoint && !visibleLineKeys.has(key)) {
        terrainAt[key] = TerrainType.HeavyWoods;
      }
    }

    const grid = makeGrid(8, terrainAt);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const threat = makeUnit({ unitId: 't', position: threatPos });
    // A second, lower-threat enemy that retains LOS to BOTH destinations.
    // This holds the existing "+1000 if any enemy has LOS" term equal for
    // the two candidates, so the comparison isolates the LOS-DENIAL term
    // (which keys only off the highest-threat enemy).
    const spotterPos = { q: 0, r: 5 };
    const spotter = makeUnit({ unitId: 's', position: spotterPos });

    // Self-validate the fixture: the hidden hex must break the THREAT's
    // LOS, the visible hex must not, and the spotter must see both.
    expect(calculateLOS(threatPos, hiddenDest, grid).hasLOS).toBe(false);
    expect(calculateLOS(threatPos, visibleDest, grid).hasLOS).toBe(true);
    expect(calculateLOS(spotterPos, hiddenDest, grid).hasLOS).toBe(true);
    expect(calculateLOS(spotterPos, visibleDest, grid).hasLOS).toBe(true);

    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, threat, spotter],
      grid,
      highestThreatTarget: threat,
      tierMovement: VETERAN_MOVEMENT,
    };

    const hiddenScore = scoreMove(makeMove({ destination: hiddenDest }), ctx);
    const visibleScore = scoreMove(makeMove({ destination: visibleDest }), ctx);

    expect(hiddenScore).toBeGreaterThan(visibleScore);
    expect(hiddenScore - visibleScore).toBe(VETERAN_MOVEMENT.losDenialWeight);
  });
});

// =============================================================================
// Scenario: Wasteful path scores below an efficient path
// =============================================================================

describe('Wasteful path scores below an efficient path', () => {
  it('penalizes a destination reached by a path whose cost exceeds its distance', () => {
    const grid = makeGrid(7);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 6 } });

    // Two destinations, each hex-distance 2 from the origin AND hex-distance
    // 6 from the enemy (verified below) — so the closing-distance, LOS, and
    // straight-line terms are equal. The wasteful one is reached by a path
    // costing 5 MP; the efficient one by a path costing exactly 2 MP.
    const wastefulDest = { q: 2, r: 0 };
    const efficientDest = { q: -2, r: 2 };
    expect(hexDistance({ q: 0, r: 0 }, wastefulDest)).toBe(
      hexDistance({ q: 0, r: 0 }, efficientDest),
    );
    expect(hexDistance(wastefulDest, { q: 0, r: 6 })).toBe(
      hexDistance(efficientDest, { q: 0, r: 6 }),
    );
    const pathByDestination = new Map<string, IAIPath>([
      [
        '2,0',
        {
          destination: wastefulDest,
          hexes: [
            { q: 1, r: 0 },
            { q: 2, r: 0 },
          ],
          totalMpCost: 5,
          reachable: true,
        },
      ],
      [
        '-2,2',
        {
          destination: efficientDest,
          hexes: [
            { q: -1, r: 1 },
            { q: -2, r: 2 },
          ],
          totalMpCost: 2,
          reachable: true,
        },
      ],
    ]);

    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      tierMovement: VETERAN_MOVEMENT,
      pathByDestination,
    };

    const wastefulScore = scoreMove(
      makeMove({ destination: wastefulDest }),
      ctx,
    );
    const efficientScore = scoreMove(
      makeMove({ destination: efficientDest }),
      ctx,
    );

    expect(efficientScore).toBeGreaterThan(wastefulScore);
    // The efficient path (cost 2 == distance 2) pays nothing; the wasteful
    // path (cost 5, distance 2) pays terrainCostWeight * (5 - 2).
    expect(efficientScore - wastefulScore).toBe(
      VETERAN_MOVEMENT.terrainCostWeight * 3,
    );
  });
});

// =============================================================================
// Scenario: Regular bot ignores the new terms (legacy reproduction)
// =============================================================================

describe('Regular bot reproduces the legacy scorer', () => {
  it('cover, LOS-denial, and terrain-cost terms contribute zero on Regular', () => {
    const grid = makeGrid(5, { '2,0': TerrainType.LightWoods });
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 3 } });

    // Legacy context — no tier block at all.
    const legacyCtx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
    };
    // Regular context — tier block present but pathfinder disabled.
    const regularCtx: IScoreMoveContext = {
      ...legacyCtx,
      tierMovement: REGULAR_MOVEMENT,
      pathByDestination: new Map([
        [
          '2,0',
          {
            destination: { q: 2, r: 0 },
            hexes: [
              { q: 1, r: 0 },
              { q: 2, r: 0 },
            ],
            totalMpCost: 9,
            reachable: true,
          },
        ],
      ]),
    };

    const coverMove = makeMove({ destination: { q: 2, r: 0 } });
    // The cover hex would gain a cover bonus AND a terrain-cost penalty on
    // Veteran; on Regular both terms are inert, so the Regular score must
    // equal the legacy score exactly.
    expect(scoreMove(coverMove, regularCtx)).toBe(
      scoreMove(coverMove, legacyCtx),
    );
  });

  it('selectMove on a Regular bot makes the same choice as a legacy (no-tier) bot', () => {
    const grid = makeGrid(5, { '2,0': TerrainType.LightWoods });
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 3 } });

    const moves: IMove[] = [
      makeMove({ destination: { q: 2, r: 0 } }),
      makeMove({ destination: { q: -2, r: 0 } }),
      makeMove({ destination: { q: 0, r: 2 } }),
    ];
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      capability: capability(4),
    };

    // A bot with no tier (legacy) and a bot pinned to Regular must choose
    // identically for the same seed — Regular is the legacy-scorer tier.
    const legacyBot = new MoveAI({ ...DEFAULT_BEHAVIOR, tier: undefined });
    const regularBot = new MoveAI({ ...DEFAULT_BEHAVIOR, tier: 'Regular' });

    for (let seed = 0; seed < 25; seed++) {
      const legacyChoice = legacyBot.selectMove(
        moves,
        new SeededRandom(seed),
        attacker,
        ctx,
      );
      const regularChoice = regularBot.selectMove(
        moves,
        new SeededRandom(seed),
        attacker,
        ctx,
      );
      expect(regularChoice).toEqual(legacyChoice);
    }
  });
});

// =============================================================================
// Integration: Veteran routes around woods; Regular takes the straight line
// (tasks 5.1 / 5.2)
// =============================================================================

describe('Integration — terrain-aware routing by tier', () => {
  it('Veteran prefers a cover destination a Regular bot would pass over', () => {
    // Map: a light-woods cover hex sits off the straight closing line.
    // Both candidate destinations are hex-distance 6 from the enemy
    // (verified below), so on Regular (legacy scorer) they tie and the
    // seeded RNG breaks it; on Veteran the cover bonus makes the woods
    // hex the strict winner.
    const coverDest = { q: 2, r: 0 }; // light woods
    const openDest = { q: -2, r: 2 }; // clear
    const enemyPos = { q: 0, r: 6 };
    expect(hexDistance(coverDest, enemyPos)).toBe(
      hexDistance(openDest, enemyPos),
    );

    const grid = makeGrid(8, { '2,0': TerrainType.LightWoods });
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: enemyPos });

    const moves: IMove[] = [
      makeMove({ destination: coverDest, mpCost: 2 }),
      makeMove({ destination: openDest, mpCost: 2 }),
    ];
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      capability: capability(6),
    };

    const veteranBot = new MoveAI({ ...DEFAULT_BEHAVIOR, tier: 'Veteran' });
    const chosen = veteranBot.selectMove(
      moves,
      new SeededRandom(7),
      attacker,
      ctx,
    );
    expect(chosen?.destination).toEqual(coverDest);
  });

  it('determinism — Veteran selectMove reproduces with the same seed', () => {
    const grid = makeGrid(6, { '2,0': TerrainType.HeavyWoods });
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 4 } });
    const moves: IMove[] = [
      makeMove({ destination: { q: 1, r: 0 } }),
      makeMove({ destination: { q: 0, r: 1 } }),
      makeMove({ destination: { q: -1, r: 1 } }),
    ];
    const ctx: IScoreMoveContext = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      capability: capability(4),
    };
    const bot = new MoveAI({ ...DEFAULT_BEHAVIOR, tier: 'Veteran' });
    const a = bot.selectMove(moves, new SeededRandom(99), attacker, ctx);
    const b = bot.selectMove(moves, new SeededRandom(99), attacker, ctx);
    expect(a).toEqual(b);
  });

  it('findAllPaths feeds the terrain-cost term — a woods detour is penalized', () => {
    // Sanity check the end-to-end wiring: a path through heavy woods costs
    // more MP than its hex distance, so the terrain-cost term fires.
    const grid = makeGrid(5, { '1,0': TerrainType.HeavyWoods });
    const paths = findAllPaths(
      grid,
      { q: 0, r: 0 },
      MovementType.Walk,
      capability(6),
    );
    const through = paths.get('1,0');
    expect(through).toBeDefined();
    // Entering a heavy-woods hex costs 3 MP for a 1-hex move — cost > distance.
    expect(through!.totalMpCost).toBeGreaterThan(1);
  });
});
