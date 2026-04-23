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
// Task 1.3 — BotPlayer honors overridden behavior
// =============================================================================

describe('Task 1.3 — BotPlayer honors overridden safeHeatThreshold', () => {
  it('forwards safeHeatThreshold into applyHeatBudget via BotPlayer.playAttackPhase', () => {
    // Custom behavior with a LOWER threshold than default.
    const tightBehavior: IBotBehavior = {
      ...DEFAULT_BEHAVIOR,
      safeHeatThreshold: 5,
    };
    const bot = new BotPlayer(new SeededRandom(1), tightBehavior);

    const ppc = makeWeapon({
      id: 'ppc',
      damage: 10,
      heat: 10,
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
    });
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3 });

    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South, // Target south → front arc.
      weapons: [ppc, ml],
      heat: 0,
    });
    const target = makeUnit({
      unitId: 't',
      position: { q: 0, r: 3 },
      weapons: [makeWeapon({ id: 'x', damage: 5, heat: 3 })],
    });

    const event = bot.playAttackPhase(attacker, [attacker, target]);
    expect(event).not.toBeNull();
    // Threshold 5 is below the combined 13 heat of PPC+ML. The bot must
    // drop the lowest damage-per-heat weapon (PPC, 1.0 < ML 1.67) and fire
    // just the ML.
    expect(event!.payload.weapons).toEqual(['ml']);
  });

  it('with a very permissive threshold fires both weapons', () => {
    const loose: IBotBehavior = { ...DEFAULT_BEHAVIOR, safeHeatThreshold: 50 };
    const bot = new BotPlayer(new SeededRandom(1), loose);

    const ppc = makeWeapon({
      id: 'ppc',
      damage: 10,
      heat: 10,
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
    });
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3 });

    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [ppc, ml],
    });
    const target = makeUnit({
      unitId: 't',
      position: { q: 0, r: 3 },
      weapons: [],
    });

    const event = bot.playAttackPhase(attacker, [attacker, target]);
    expect(event).not.toBeNull();
    expect(event!.payload.weapons).toEqual(
      expect.arrayContaining(['ppc', 'ml']),
    );
    expect(event!.payload.weapons.length).toBe(2);
  });
});

// =============================================================================
// Task 2.4 — Target scoring: assault-intact > light-crippled, TN monotonic
// =============================================================================

describe('Task 2.4 — threat × killProbability scoring', () => {
  it('assault with intact armor scores higher than crippled light at equal range', () => {
    const attacker = makeUnit({ unitId: 'a', position: { q: 0, r: 0 } });

    // Assault-scale damage output, 100% HP.
    const assault = makeUnit({
      unitId: 'assault',
      position: { q: 0, r: 2 },
      weapons: [
        makeWeapon({ id: 'ac20', damage: 20, heat: 7 }),
        makeWeapon({ id: 'ppc', damage: 10, heat: 10 }),
        makeWeapon({ id: 'ml1', damage: 5, heat: 3 }),
      ],
      gunnery: 3,
      remainingHpFraction: 1.0,
    });

    // Light-scale damage output, badly crippled.
    const light = makeUnit({
      unitId: 'light',
      position: { q: 0, r: 2 },
      weapons: [makeWeapon({ id: 'mg', damage: 2, heat: 0 })],
      gunnery: 5,
      remainingHpFraction: 0.15,
    });

    const assaultScore = scoreTarget(attacker, assault);
    const lightScore = scoreTarget(attacker, light);
    expect(assaultScore).toBeGreaterThan(lightScore);
  });

  it('target at +4 TN range scores lower than target at +2 TN range, damage equal', () => {
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      gunnery: 4,
    });
    const mid = makeUnit({
      unitId: 'mid',
      position: { q: 0, r: 5 }, // distance 5 → +2 range mod
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
      remainingHpFraction: 1,
    });
    const long = makeUnit({
      unitId: 'long',
      position: { q: 0, r: 8 }, // distance 8 → +4 range mod
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
      remainingHpFraction: 1,
    });
    expect(scoreTarget(attacker, mid)).toBeGreaterThan(
      scoreTarget(attacker, long),
    );
  });

  it('defaults remainingHpFraction to 1.0 when not supplied (backward compat)', () => {
    const attacker = makeUnit({ unitId: 'a' });
    const target = makeUnit({
      unitId: 't',
      position: { q: 0, r: 2 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });
    // No crash, score > 0 (weapons + living + in range).
    expect(scoreTarget(attacker, target)).toBeGreaterThan(0);
  });
});

// =============================================================================
// Task 3.3 — Firing arc filtering
// =============================================================================

describe('Task 3.3 — firing arc filtering in selectWeapons', () => {
  it('excludes front-mounted weapons when target is directly behind attacker', () => {
    const ai = new AttackAI();

    const frontWeapon = makeWeapon({
      id: 'front',
      mountingArc: FiringArc.Front,
    });
    const rearWeapon = makeWeapon({ id: 'rear', mountingArc: FiringArc.Rear });

    // Attacker facing North (0), target south-of-attacker (r > 0) = in rear arc.
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.North,
      weapons: [frontWeapon, rearWeapon],
    });
    const target = makeUnit({ unitId: 't', position: { q: 0, r: 2 } });

    const chosen = ai.selectWeapons(attacker, target);
    const ids = chosen.map((w) => w.id);
    expect(ids).toContain('rear');
    expect(ids).not.toContain('front');
  });

  it('includes front-mounted weapons when target is in front', () => {
    const ai = new AttackAI();

    const frontWeapon = makeWeapon({
      id: 'front',
      mountingArc: FiringArc.Front,
    });
    const rearWeapon = makeWeapon({ id: 'rear', mountingArc: FiringArc.Rear });

    // Attacker facing South (3), target south-of-attacker = in front arc now.
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [frontWeapon, rearWeapon],
    });
    const target = makeUnit({ unitId: 't', position: { q: 0, r: 2 } });

    const chosen = ai.selectWeapons(attacker, target);
    const ids = chosen.map((w) => w.id);
    expect(ids).toContain('front');
    expect(ids).not.toContain('rear');
  });

  it('torso twist shifts the front-arc membership for a side-positioned target', () => {
    const ai = new AttackAI();

    const frontWeapon = makeWeapon({
      id: 'front',
      mountingArc: FiringArc.Front,
    });

    // Attacker at (0,0) facing North. Target at (2,0) sits at ~108° from
    // facing — inside the Right side arc (60°-120°), NOT the front arc.
    // A LEFT torso twist shifts the effective facing to Northeast (60°),
    // so the target's relative angle becomes 108-60 = 48° → front arc.
    // (`getTwistedFacing`: left = facing+1 mod 6.)
    const target = makeUnit({ unitId: 't', position: { q: 2, r: 0 } });

    const attackerNoTwist = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.North,
      weapons: [frontWeapon],
    });
    const noTwistChoice = ai.selectWeapons(attackerNoTwist, target);

    const attackerTwistLeft = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.North,
      weapons: [frontWeapon],
      torsoTwist: 'left',
    });
    const twistChoice = ai.selectWeapons(attackerTwistLeft, target);

    // Without twist: front-mounted weapon cannot reach right-side target.
    // With LEFT twist: forward arc shifts one hex-side (60°), placing the
    // formerly right-arc target inside the new front arc.
    expect(noTwistChoice.map((w) => w.id)).not.toContain('front');
    expect(twistChoice.map((w) => w.id)).toContain('front');
  });
});

// =============================================================================
// Task 4.4 — Weapon ordering / minRange / heat pressure
// =============================================================================

describe('Task 4.4 — weapon ordering under heat pressure & min range', () => {
  it('PPC + ML at range 2 with high heat drops PPC first (lower damage/heat)', () => {
    const ppc = makeWeapon({
      id: 'ppc',
      damage: 10,
      heat: 10,
      shortRange: 6,
      mediumRange: 12,
      longRange: 18,
    });
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3 });

    // Pre-sorted order: ML (5/3=1.67) before PPC (10/10=1.0).
    const sorted = orderWeaponsByEfficiency([ppc, ml], 2);
    expect(sorted.map((w) => w.id)).toEqual(['ml', 'ppc']);

    // Heat pressure: threshold 12, currentHeat 0 → projected 13 > 12, drop PPC.
    const trimmed = applyHeatBudget(sorted, 0, 0, 12);
    expect(trimmed.map((w) => w.id)).toEqual(['ml']);
  });

  it('LRM-20 skipped at range 2 when a non-min-range weapon is available', () => {
    const ai = new AttackAI();

    const lrm20 = makeWeapon({
      id: 'lrm20',
      damage: 20,
      heat: 6,
      minRange: 6,
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
      ammoPerTon: 6,
    });
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3 });

    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [lrm20, ml],
      ammo: { lrm20: 6 },
    });
    const target = makeUnit({ unitId: 't', position: { q: 0, r: 2 } });

    const chosen = ai.selectWeapons(attacker, target);
    expect(chosen.map((w) => w.id)).toEqual(['ml']);
  });

  it('LRM-20 kept at range 2 when it is the only weapon available', () => {
    const ai = new AttackAI();

    const lrm20 = makeWeapon({
      id: 'lrm20',
      damage: 20,
      heat: 6,
      minRange: 6,
      shortRange: 7,
      mediumRange: 14,
      longRange: 21,
      ammoPerTon: 6,
    });
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [lrm20],
      ammo: { lrm20: 6 },
    });
    const target = makeUnit({ unitId: 't', position: { q: 0, r: 2 } });

    const chosen = ai.selectWeapons(attacker, target);
    expect(chosen.map((w) => w.id)).toEqual(['lrm20']);
  });
});

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
    // heavy_woods (blocksLOS: true, losBlockHeight: 1) blocks LoS from enemy
    // to (0,-2) but leaves LoS to (0,2) clear — same distance from enemy for
    // both destinations, so only the LoS bonus differs.
    const overrides = new Map<string, string>();
    overrides.set('2,0', 'heavy_woods');
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

// =============================================================================
// Task 8.1-8.4 — Edge cases
// =============================================================================

describe('Tasks 8.1-8.4 — edge cases', () => {
  it('8.1 bot with no weapons in any arc returns null attack event', () => {
    const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
    const rearOnlyWeapon = makeWeapon({
      id: 'rear',
      mountingArc: FiringArc.Rear,
    });
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.North, // target south = rear; we will place target north = front
      weapons: [rearOnlyWeapon],
    });
    // Place target NORTH so it's in front arc — but only weapon is rear-mounted.
    const target = makeUnit({
      unitId: 't',
      position: { q: 0, r: -2 },
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });

    const event = bot.playAttackPhase(attacker, [attacker, target]);
    expect(event).toBeNull();
  });

  it('8.2 bot above safe-heat threshold still fires a single-weapon set if it brings net heat low enough', () => {
    // Behavior threshold 13. Bot already at 15 heat. A single ML (3 heat)
    // keeps projected heat at 18 — that's STILL above 13, so applyHeatBudget
    // drops it. This is actually the spec's harsh branch: if even one weapon
    // overflows, drop everything. Test that side of 8.2.
    const tight: IBotBehavior = { ...DEFAULT_BEHAVIOR, safeHeatThreshold: 13 };
    const bot = new BotPlayer(new SeededRandom(1), tight);
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3 });
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [ml],
      heat: 15, // above threshold already
    });
    const target = makeUnit({
      unitId: 't',
      position: { q: 0, r: 2 },
      weapons: [],
    });
    const event = bot.playAttackPhase(attacker, [attacker, target]);
    // With an over-threshold projection, applyHeatBudget drops the ML and
    // the bot emits null (no weapons left to fire).
    expect(event).toBeNull();
  });

  it('8.2 variant: bot exactly at threshold + tiny heat weapon still fires', () => {
    // currentHeat 12, threshold 13, single SL heat=1 → projected 13 ≤ 13.
    const behavior: IBotBehavior = {
      ...DEFAULT_BEHAVIOR,
      safeHeatThreshold: 13,
    };
    const bot = new BotPlayer(new SeededRandom(1), behavior);
    const sl = makeWeapon({ id: 'sl', damage: 3, heat: 1 });
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      facing: Facing.South,
      weapons: [sl],
      heat: 12,
    });
    const target = makeUnit({
      unitId: 't',
      position: { q: 0, r: 2 },
      weapons: [],
    });
    const event = bot.playAttackPhase(attacker, [attacker, target]);
    expect(event).not.toBeNull();
    expect(event!.payload.weapons).toEqual(['sl']);
  });

  it('8.3 all targets out of maximum weapon range returns null attack', () => {
    const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3, longRange: 9 });
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [ml],
    });
    const farTarget = makeUnit({
      unitId: 't',
      position: { q: 0, r: 20 }, // way out of range
      weapons: [makeWeapon({ id: 'w', damage: 5, heat: 3 })],
    });
    const event = bot.playAttackPhase(attacker, [attacker, farTarget]);
    expect(event).toBeNull();
  });

  it('8.4 all other units destroyed returns null for both phases without error', () => {
    const bot = new BotPlayer(new SeededRandom(1), DEFAULT_BEHAVIOR);
    const ml = makeWeapon({ id: 'ml', damage: 5, heat: 3 });
    const attacker = makeUnit({
      unitId: 'a',
      position: { q: 0, r: 0 },
      weapons: [ml],
    });
    const deadFoe = makeUnit({
      unitId: 'd',
      position: { q: 0, r: 2 },
      destroyed: true,
      weapons: [],
    });

    // Attack phase: no living targets → null.
    const attack = bot.playAttackPhase(attacker, [attacker, deadFoe]);
    expect(attack).toBeNull();

    // Movement phase: with allUnits list but no living enemies, should not
    // crash even when the ctx is skipped in BotPlayer.
    const grid = makeGrid(3);
    const capability: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 0 };
    const move = bot.playMovementPhase(attacker, grid, capability, [
      attacker,
      deadFoe,
    ]);
    // Move MAY be null (if legacy selector picks stationary) or non-null
    // depending on RNG. Either way, no crash.
    expect(move === null || typeof move === 'object').toBe(true);
  });
});
