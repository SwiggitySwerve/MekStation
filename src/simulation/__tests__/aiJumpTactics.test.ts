/**
 * Tests for AI jump-jet tactics (A4).
 *
 * Covers the `AI Jump-Jet Tactics` requirement of `add-ai-advanced-systems`
 * — scenarios "Bot jumps to clear costly terrain", "Heat-unsafe jump is
 * rejected", and "Bot jumps to escape a charge" (the `evaluateJump` side).
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Jump-Jet Tactics
 */

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import { Facing, MovementType, TerrainType } from '@/types/gameplay';

import type { IAIUnitState } from '../ai/types';

import { evaluateJump } from '../ai/AIJumpTactics';

/**
 * Build a hexagonal grid. `terrainAt` maps a `"q,r"` key to a terrain tag;
 * `elevationAt` maps a key to an elevation level. Unlisted hexes default to
 * clear ground at elevation 0.
 */
function buildGrid(
  radius: number,
  terrainAt: Record<string, string> = {},
  elevationAt: Record<string, number> = {},
): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      const key = `${q},${r}`;
      hexes.set(key, {
        coord: { q, r },
        occupantId: null,
        terrain: terrainAt[key] ?? 'clear',
        elevation: elevationAt[key] ?? 0,
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

function capability(walk: number, jump: number): IMovementCapability {
  return { walkMP: walk, runMP: Math.ceil(walk * 1.5), jumpMP: jump };
}

describe('AIJumpTactics.evaluateJump', () => {
  it('returns a zero score when the unit has no jump capability', () => {
    const grid = buildGrid(5);
    const unit = makeUnit({ unitId: 'a' });
    const evaluation = evaluateJump(unit, grid, capability(4, 0), []);
    expect(evaluation.bestJumpScore).toBe(0);
    expect(evaluation.heatUnsafe).toBe(false);
  });

  describe('Scenario: Bot jumps to clear costly terrain', () => {
    it('scores a jump over a heavy-woods wall high for terrain-clearing', () => {
      // A wall of heavy woods (cost 3) separates the origin from a clear
      // hex three rings out. Walking there is expensive; jumping ignores
      // the woods entirely. The jump destination earns a terrain-clearing
      // bonus proportional to the MP the walk equivalent wastes.
      const wall: Record<string, string> = {
        '1,0': TerrainType.HeavyWoods,
        '1,-1': TerrainType.HeavyWoods,
        '1,1': TerrainType.HeavyWoods,
        '2,0': TerrainType.HeavyWoods,
        '2,-1': TerrainType.HeavyWoods,
        '2,1': TerrainType.HeavyWoods,
      };
      const grid = buildGrid(6, wall);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), []);

      // The jump clears multiple heavy-woods hexes — a high positive score.
      expect(evaluation.bestJumpScore).toBeGreaterThan(0);
    });

    it('scores a jump over open ground near zero (no terrain to clear)', () => {
      // No terrain, no elevation, no enemies — a jump over open ground is
      // not purposeful, so its tactical score is zero.
      const grid = buildGrid(6);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), []);

      expect(evaluation.bestJumpScore).toBe(0);
    });
  });

  describe('Scenario: elevation gain is rewarded', () => {
    it('scores a jump to higher elevation above a flat-ground jump', () => {
      // A ridge at elevation 2 sits one hex out. A jump onto it gains
      // elevation; a jump onto flat ground does not.
      const grid = buildGrid(6, {}, { '2,0': 2, '1,0': 1 });
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), []);

      // Best jump goes to the elevated ridge — a positive elevation bonus.
      expect(evaluation.bestJumpScore).toBeGreaterThan(0);
    });
  });

  describe('Scenario: Heat-unsafe jump is rejected', () => {
    it('flags heatUnsafe and drives the score deep negative when a jump risks shutdown', () => {
      // A hot unit (heat 12) with weak dissipation. A 4-hex jump adds
      // max(4,3)=4 heat per turn, and with only 1 dissipation the heat
      // curve climbs past the shutdown ceiling (14) inside the window.
      const grid = buildGrid(6);
      const unit = makeUnit({
        unitId: 'a',
        position: { q: 0, r: 0 },
        heat: 12,
      });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), [], {
        heatDissipation: 1,
        heatLookaheadTurns: 4,
      });

      expect(evaluation.heatUnsafe).toBe(true);
      // The heat-unsafe penalty drives the net score deep negative so the
      // jump cannot clear the selection threshold on heat grounds alone.
      expect(evaluation.bestJumpScore).toBeLessThan(0);
    });

    it('does not flag heatUnsafe for a cool unit with strong dissipation', () => {
      const grid = buildGrid(6);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 }, heat: 0 });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), [], {
        heatDissipation: 10,
        heatLookaheadTurns: 4,
      });

      expect(evaluation.heatUnsafe).toBe(false);
    });

    it('never flags heatUnsafe when the heat lookahead is disabled', () => {
      const grid = buildGrid(6);
      const unit = makeUnit({
        unitId: 'a',
        position: { q: 0, r: 0 },
        heat: 13,
      });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), [], {
        heatDissipation: 0,
        heatLookaheadTurns: 0,
      });

      expect(evaluation.heatUnsafe).toBe(false);
    });
  });

  describe('Scenario: Bot jumps to escape a charge', () => {
    it('awards a charge-escape bonus for a jump that breaks adjacency', () => {
      // An enemy is adjacent to the unit. A jump that lands two-plus hexes
      // away breaks the adjacency and earns the charge-escape bonus.
      const grid = buildGrid(6);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 1, r: 0 } });

      const escapeEval = evaluateJump(unit, grid, capability(6, 4), [enemy]);

      // With an adjacent enemy, the best jump breaks adjacency and earns
      // the charge-escape bonus — a high positive score.
      expect(escapeEval.bestJumpScore).toBeGreaterThan(0);
    });

    it('awards no charge-escape bonus when no enemy is adjacent', () => {
      const grid = buildGrid(6);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      // Enemy is far away — not adjacent, no charge threat.
      const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 5 } });

      const evaluation = evaluateJump(unit, grid, capability(6, 4), [enemy]);

      // No terrain, no elevation, no adjacent enemy — score is zero.
      expect(evaluation.bestJumpScore).toBe(0);
    });
  });

  describe('determinism', () => {
    it('returns an identical evaluation for identical inputs', () => {
      const grid = buildGrid(
        6,
        { '1,0': TerrainType.HeavyWoods },
        {
          '2,0': 1,
        },
      );
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 1, r: -1 } });

      const first = evaluateJump(unit, grid, capability(6, 4), [enemy]);
      const second = evaluateJump(unit, grid, capability(6, 4), [enemy]);

      expect(first).toEqual(second);
    });
  });
});
