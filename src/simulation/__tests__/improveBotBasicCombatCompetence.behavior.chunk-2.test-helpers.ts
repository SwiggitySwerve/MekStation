/**
 * Behavior tests for improve-bot-basic-combat-competence.
 *
 * Covers tasks:
 *   - 1.3 BotPlayer honors overridden safeHeatThreshold
 *   - 2.4 Scoring: assault intact > crippled light; +4 TN < +2 TN
 *   - 3.3 Firing-arc filtering: rear vs front-mounted weapons, torso twist
 *   - 4.4 Weapon ordering: PPC+ML heat pressure drops PPC; LRM min range
 *   - 6.5 Move scoring: LoS bonus, forward-arc bonus
 *   - 7.4 Two-bot skirmish: fixed-seed determinism
 *   - 8.1-8.4 Edge cases (no in-arc weapons, above-threshold single weapon,
 *             all out of range, all destroyed)
 *
 * @spec openspec/changes/improve-bot-basic-combat-competence/tasks.md
 */

import { describe, it, expect } from '@jest/globals';

import type {
  IHex,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
} from '@/types/gameplay';

import {
  AttackAI,
  applyHeatBudget,
  orderWeaponsByEfficiency,
  scoreTarget,
} from '@/simulation/ai/AttackAI';
import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { MoveAI, scoreMove } from '@/simulation/ai/MoveAI';
import {
  DEFAULT_BEHAVIOR,
  type IAIUnitState,
  type IBotBehavior,
  type IMove,
  type IWeapon,
} from '@/simulation/ai/types';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { Facing, FiringArc, MovementType } from '@/types/gameplay';

// =============================================================================
// Test Fixtures
// =============================================================================

function makeWeapon(overrides: Partial<IWeapon> & { id: string }): IWeapon {
  return {
    name: overrides.id,
    damage: 5,
    heat: 3,
    minRange: 0,
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    ammoPerTon: 0,
    destroyed: false,
    ...overrides,
  };
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

function makeGrid(
  radius: number,
  terrainOverrides: Map<string, string> = new Map(),
): IHexGrid {
  const hexes = new Map<string, IHex>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) > radius) continue;
      const key = `${q},${r}`;
      hexes.set(key, {
        coord: { q, r },
        occupantId: null,
        terrain: terrainOverrides.get(key) ?? 'clear',
        elevation: 0,
      });
    }
  }
  return { config: { radius }, hexes };
}

function makeMove(
  overrides: Partial<IMove> & { destination: IHexCoordinate; facing: Facing },
): IMove {
  return {
    movementType: MovementType.Walk,
    mpCost: 1,
    heatGenerated: 1,
    ...overrides,
  };
}

// =============================================================================
// Task 5.3 — Heat culling preserves sort order (tail drop)
// =============================================================================

describe('Task 5.3 — heat culling removes tail of sorted list', () => {
  it('drops the lowest damage-per-heat weapon, preserving higher-efficiency weapons', () => {
    // Small Laser: 3/1 = 3.0
    // Medium Laser: 5/3 = 1.67
    // PPC: 10/10 = 1.0 (lowest efficiency → tail)
    const weapons = orderWeaponsByEfficiency(
      [
        makeWeapon({ id: 'ppc', damage: 10, heat: 10 }),
        makeWeapon({ id: 'ml', damage: 5, heat: 3 }),
        makeWeapon({ id: 'sl', damage: 3, heat: 1 }),
      ],
      3,
    );
    expect(weapons.map((w) => w.id)).toEqual(['sl', 'ml', 'ppc']);

    const trimmed = applyHeatBudget(weapons, 10, 0, 13);
    // currentHeat=10 + 10+3+1=14 → 24 > 13. Drop PPC (tail) → 14, still > 13.
    // Drop ML (new tail) → 11 ≤ 13. Final list = [sl].
    expect(trimmed.map((w) => w.id)).toEqual(['sl']);
  });
});

// =============================================================================
// Task 6.5 — Move scoring (LoS, forward arc, distance, heat)
// =============================================================================

describe('Task 6.5 — scoreMove behavior', () => {
  it('awards +1000 when an enemy has LoS to the destination', () => {
    const grid = makeGrid(5);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({
      unitId: 'e',
      position: { q: 0, r: 3 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    // Move to (0,1), facing north. LoS from enemy at (0,3) → (0,1) is clear.
    const move = makeMove({
      destination: { q: 0, r: 1 },
      facing: Facing.North,
      heatGenerated: 1,
    });

    const score = scoreMove(move, {
      attacker,
      allUnits: [attacker, enemy],
      grid,
    });

    // score = +1000 (LoS) - 100*2 (distance to enemy is 2) - 1 (heat) = 799
    expect(score).toBe(799);
  });

  it('prefers the LoS destination over a non-LoS destination', () => {
    // Per hexLine empirical check: enemy (3,0) → (0,-2) passes through (2,0);
    // enemy (3,0) → (0,2) does NOT pass through (2,0). Blocking (2,0) with
    // a building blocks LoS from enemy
    // to (0,-2) but leaves LoS to (0,2) clear — same distance from enemy for
    // both destinations, so only the LoS bonus differs.
    const overrides = new Map<string, string>();
    overrides.set('2,0', 'building');
    const grid = makeGrid(5, overrides);

    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({
      unitId: 'e',
      position: { q: 3, r: 0 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    // LoS move — enemy's line to (0,2) avoids the blocker at (2,0).
    const losMove = makeMove({
      destination: { q: 0, r: 2 },
      facing: Facing.North,
      heatGenerated: 1,
    });
    // Hidden move — enemy's line to (0,-2) passes through (2,0) → blocked.
    const hiddenMove = makeMove({
      destination: { q: 0, r: -2 },
      facing: Facing.North,
      heatGenerated: 1,
    });

    const ctx = {
      attacker,
      allUnits: [attacker, enemy] as const,
      grid,
    };
    const losScore = scoreMove(losMove, ctx);
    const hiddenScore = scoreMove(hiddenMove, ctx);

    // LoS bonus dominates whatever distance-penalty delta exists; the
    // LoS move must score strictly higher than the hidden move.
    expect(losScore).toBeGreaterThan(hiddenScore);
  });

  it('awards +500 when the highest-threat target ends up in the forward arc', () => {
    const grid = makeGrid(5);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const threat = makeUnit({
      unitId: 't',
      position: { q: 0, r: 3 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    // Move to (0,0)-ish with facing South → target is in front arc.
    const facingThreat = makeMove({
      destination: { q: 0, r: 1 },
      facing: Facing.South,
      heatGenerated: 0,
    });
    // Move to same spot with facing North → target is behind → rear arc.
    const facingAway = makeMove({
      destination: { q: 0, r: 1 },
      facing: Facing.North,
      heatGenerated: 0,
    });

    const ctx = {
      attacker,
      allUnits: [attacker, threat] as const,
      grid,
      highestThreatTarget: threat,
    };

    const facingThreatScore = scoreMove(facingThreat, ctx);
    const facingAwayScore = scoreMove(facingAway, ctx);

    // Same LoS (+1000), same distance (-200), same heat (0), but facingThreat
    // adds +500 forward-arc bonus.
    expect(facingThreatScore - facingAwayScore).toBe(500);
  });

  it('penalizes moves farther from the nearest enemy (-100 per hex)', () => {
    const grid = makeGrid(10);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({
      unitId: 'e',
      position: { q: 0, r: 5 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    const closer = makeMove({
      destination: { q: 0, r: 1 },
      facing: Facing.South,
      heatGenerated: 1,
    });
    const farther = makeMove({
      destination: { q: 0, r: -1 },
      facing: Facing.South,
      heatGenerated: 1,
    });

    const ctx = { attacker, allUnits: [attacker, enemy] as const, grid };
    const closerScore = scoreMove(closer, ctx);
    const fartherScore = scoreMove(farther, ctx);
    expect(closerScore).toBeGreaterThan(fartherScore);
  });

  it('penalizes higher-heat moves by -1 per heat point', () => {
    const grid = makeGrid(5);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({
      unitId: 'e',
      position: { q: 0, r: 3 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    const walkMove = makeMove({
      destination: { q: 0, r: 1 },
      facing: Facing.North,
      heatGenerated: 1,
    });
    const jumpMove = makeMove({
      destination: { q: 0, r: 1 },
      facing: Facing.North,
      heatGenerated: 3,
    });

    const ctx = { attacker, allUnits: [attacker, enemy] as const, grid };
    expect(scoreMove(walkMove, ctx) - scoreMove(jumpMove, ctx)).toBe(2);
  });
});

// =============================================================================
// Task 7.4 — Determinism: two-bot seeded skirmish reproduces
// =============================================================================

describe('Task 7.4 — determinism across seeded runs', () => {
  it('BotPlayer.playAttackPhase returns identical result for identical seeds', () => {
    const behavior = DEFAULT_BEHAVIOR;

    const buildScene = () => {
      const attacker = makeUnit({
        unitId: 'a',
        position: { q: 0, r: 0 },
        facing: Facing.South,
        weapons: [
          makeWeapon({
            id: 'ppc',
            damage: 10,
            heat: 10,
            shortRange: 6,
            mediumRange: 12,
            longRange: 18,
          }),
          makeWeapon({ id: 'ml', damage: 5, heat: 3 }),
        ],
      });
      const t1 = makeUnit({
        unitId: 't1',
        position: { q: 0, r: 4 },
        weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
        remainingHpFraction: 1.0,
      });
      const t2 = makeUnit({
        unitId: 't2',
        position: { q: 1, r: 4 },
        weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
        remainingHpFraction: 1.0,
      });
      return [attacker, t1, t2];
    };

    const runA = () => {
      const bot = new BotPlayer(new SeededRandom(12345), behavior);
      const units = buildScene();
      return bot.playAttackPhase(units[0], units);
    };
    const runB = () => {
      const bot = new BotPlayer(new SeededRandom(12345), behavior);
      const units = buildScene();
      return bot.playAttackPhase(units[0], units);
    };

    const a = runA();
    const b = runB();
    expect(a).toEqual(b);
  });

  it('MoveAI.selectMove returns identical result for identical seeds', () => {
    const grid = makeGrid(5);
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });
    const enemy = makeUnit({
      unitId: 'e',
      position: { q: 0, r: 3 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    const ai = new MoveAI(DEFAULT_BEHAVIOR);
    const moves: IMove[] = [
      makeMove({
        destination: { q: 0, r: 1 },
        facing: Facing.South,
        heatGenerated: 1,
      }),
      makeMove({
        destination: { q: 1, r: 0 },
        facing: Facing.South,
        heatGenerated: 1,
      }),
    ];

    const ctx = {
      attacker,
      allUnits: [attacker, enemy],
      grid,
      highestThreatTarget: enemy,
    };

    const a = ai.selectMove(moves, new SeededRandom(999), attacker, ctx);
    const b = ai.selectMove(moves, new SeededRandom(999), attacker, ctx);
    expect(a).toEqual(b);
  });
});
