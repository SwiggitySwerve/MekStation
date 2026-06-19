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
