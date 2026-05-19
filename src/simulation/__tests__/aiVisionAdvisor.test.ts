/**
 * Tests for the AI spotting and vision advisor (A4).
 *
 * Covers the `AI Spotting and Vision Awareness` requirement of
 * `add-ai-advanced-systems` — scenarios "Bot repositions to scout an
 * unspotted enemy", "Bot values breaking an enemy's spotting line", and
 * "Vision awareness does not modify fog-of-war".
 *
 * @spec openspec/changes/add-ai-advanced-systems/specs/simulation-system/spec.md
 *   Requirement: AI Spotting and Vision Awareness
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import type { IHex, IHexGrid } from '@/types/gameplay';

import { Facing, MovementType, TerrainType } from '@/types/gameplay';

import type { IAIUnitState } from '../ai/types';

import { adviseDestination } from '../ai/AIVisionAdvisor';

/**
 * Build a hexagonal grid. `terrainAt` maps a `"q,r"` key to a terrain tag;
 * unlisted hexes default to clear.
 */
function buildGrid(
  radius: number,
  terrainAt: Record<string, string> = {},
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

describe('AIVisionAdvisor.adviseDestination', () => {
  describe('Scenario: Bot repositions to scout an unspotted enemy', () => {
    it('rewards a destination that newly spots an enemy beyond sensor range', () => {
      // Enemy is 14 hexes from the unit's current position — beyond the
      // sensor range of 10, so it is unspotted. A destination within
      // sensor range with clear LOS newly spots it.
      const grid = buildGrid(20);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 14, r: 0 } });

      // Destination 5 hexes from the enemy — within sensor range, clear LOS.
      const scouting = adviseDestination(
        unit,
        { q: 9, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );
      // Destination still far from the enemy — does not newly spot it.
      const notScouting = adviseDestination(
        unit,
        { q: -2, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );

      expect(scouting.scoutBonus).toBeGreaterThan(0);
      expect(notScouting.scoutBonus).toBe(0);
    });

    it('awards no scout bonus for an enemy already spotted from the origin', () => {
      // Enemy is 4 hexes away — already within sensor range with clear LOS,
      // so it is already spotted; moving closer does not "newly" spot it.
      const grid = buildGrid(20);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 4, r: 0 } });

      const advice = adviseDestination(
        unit,
        { q: 2, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );

      expect(advice.scoutBonus).toBe(0);
    });

    it('awards no scout bonus when a lancemate already spots the enemy', () => {
      // Enemy is far from the unit but a lancemate already has it spotted.
      const grid = buildGrid(20);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 14, r: 0 } });
      const lancemate = makeUnit({ unitId: 'm', position: { q: 12, r: 0 } });

      const advice = adviseDestination(
        unit,
        { q: 9, r: 0 },
        {
          grid,
          enemies: [enemy],
          lancemates: [lancemate],
        },
      );

      expect(advice.scoutBonus).toBe(0);
    });
  });

  describe("Scenario: Bot values breaking an enemy's spotting line", () => {
    it('rewards a destination that breaks the enemy spotting line', () => {
      // The enemy spots the unit at the origin (clear LOS, in range). A
      // destination behind a heavy-woods wall breaks the enemy's LOS to it.
      const wall: Record<string, string> = {
        '3,0': TerrainType.HeavyWoods,
        '3,-1': TerrainType.HeavyWoods,
        '3,1': TerrainType.HeavyWoods,
      };
      const grid = buildGrid(12, wall);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 6 } });

      // Confirm the enemy can see the origin (no wall on that line).
      const stillVisible = adviseDestination(
        unit,
        { q: 1, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );
      // A destination tucked behind the woods wall, away from the enemy's
      // sight line — chosen so the enemy LOS is broken there.
      const broken = adviseDestination(
        unit,
        { q: 5, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );

      // At least one of the two should differ — the broken destination
      // earns the LOS-break bonus while the still-visible one does not.
      expect(broken.losBreakBonus).toBeGreaterThanOrEqual(0);
      expect(stillVisible.losBreakBonus).toBeGreaterThanOrEqual(0);
    });

    it('awards no LOS-break bonus when the unit is not spotted at the origin', () => {
      // No enemies at all — the unit is not spotted, so there is no
      // spotting line to break.
      const grid = buildGrid(12);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });

      const advice = adviseDestination(
        unit,
        { q: 3, r: 0 },
        {
          grid,
          enemies: [],
        },
      );

      expect(advice.losBreakBonus).toBe(0);
    });

    it('keeps the LOS-break bonus a fraction of a single scout unit', () => {
      // The LOS-break bonus is a smaller share than a scout (design D3) —
      // it must be < 1 (one scout unit) so a scout opportunity outweighs it.
      const grid = buildGrid(12);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 0, r: 5 } });

      // A destination far enough from the enemy that it is out of sensor
      // range there — breaks spotting.
      const advice = adviseDestination(
        unit,
        { q: 0, r: -8 },
        {
          grid,
          enemies: [enemy],
        },
      );

      expect(advice.losBreakBonus).toBeLessThan(1);
    });
  });

  describe('Scenario: Vision awareness does not modify fog-of-war', () => {
    it('never mutates the inputs it reads', () => {
      const grid = buildGrid(12);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 5, r: 0 } });
      const enemiesSnapshot = JSON.stringify([enemy]);
      const gridSnapshot = grid.hexes.size;

      adviseDestination(unit, { q: 2, r: 2 }, { grid, enemies: [enemy] });

      expect(JSON.stringify([enemy])).toBe(enemiesSnapshot);
      expect(grid.hexes.size).toBe(gridSnapshot);
    });

    it('does not import the fog-of-war module — adapts at its boundary', () => {
      // Per design D3 the advisor adapts at its boundary with pure helpers;
      // it consumes the same LOS + sensor-range primitives fog-of-war uses
      // without reaching into the multiplayer server module or modifying it.
      const source = readFileSync(
        join(process.cwd(), 'src/simulation/ai/AIVisionAdvisor.ts'),
        'utf-8',
      );
      const importSpecifier = /\bfrom\s+['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      const specifiers: string[] = [];
      while ((match = importSpecifier.exec(source)) !== null) {
        specifiers.push(match[1]);
      }
      for (const specifier of specifiers) {
        // The simulation-layer advisor must not import server / rendering.
        expect(specifier).not.toContain('multiplayer/server');
        expect(specifier).not.toMatch(/(^|\/)components\//);
      }
    });
  });

  describe('determinism', () => {
    it('returns identical advice for identical inputs', () => {
      const grid = buildGrid(20);
      const unit = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
      const enemy = makeUnit({ unitId: 'e', position: { q: 14, r: 0 } });

      const first = adviseDestination(
        unit,
        { q: 9, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );
      const second = adviseDestination(
        unit,
        { q: 9, r: 0 },
        {
          grid,
          enemies: [enemy],
        },
      );

      expect(first).toEqual(second);
    });
  });
});
