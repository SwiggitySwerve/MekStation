/**
 * Tests for AI lance-coordination tactics — multi-unit threat aggregation,
 * focus-fire coordination, and the per-lance turn plan.
 *
 * Covers `add-ai-coordination-tactics` Requirements "Multi-Unit Threat
 * Aggregation", "Focus-Fire Coordination", and "Per-Lance Turn Plan".
 *
 * @spec openspec/changes/add-ai-coordination-tactics/specs/simulation-system/spec.md
 *   Requirement: Multi-Unit Threat Aggregation
 *   Requirement: Focus-Fire Coordination
 *   Requirement: Per-Lance Turn Plan
 */

import { Facing, MovementType } from '@/types/gameplay';

import type { IAIStructureState, IAIUnitState, IWeapon } from '../ai/types';

import {
  coordinateFire,
  expectedDamage,
  remainingDurability,
} from '../ai/AIFireCoordinator';
import { computeLanceCentroid, planTurn } from '../ai/AILancePlanner';
import { buildThreatMap } from '../ai/AIThreatMap';

// =============================================================================
// Fixtures
// =============================================================================

function weapon(overrides: Partial<IWeapon> = {}): IWeapon {
  return {
    id: 'mlas',
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
    ...overrides,
  };
}

function unit(
  overrides: Partial<IAIUnitState> & { unitId: string },
): IAIUnitState {
  return {
    position: { q: 0, r: 0 },
    facing: Facing.North,
    heat: 0,
    weapons: [weapon()],
    ammo: {},
    destroyed: false,
    gunnery: 4,
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    ...overrides,
  };
}

/** A structure state with `total` armour + internal split evenly across CT. */
function durability(total: number): IAIStructureState {
  const armor = Math.ceil(total / 2);
  const internal = total - armor;
  return {
    armorByLocation: { center_torso: armor },
    armorMaxByLocation: { center_torso: armor },
    internalByLocation: { center_torso: internal },
    internalMaxByLocation: { center_torso: internal },
  };
}

// =============================================================================
// Multi-Unit Threat Aggregation
// =============================================================================

describe('buildThreatMap — multi-unit threat aggregation', () => {
  it('a high-threat enemy ranks above a low-threat enemy', () => {
    // The big enemy carries far more weapon damage, so its summed threat
    // posture across the lance dominates.
    const bigEnemy = unit({
      unitId: 'big',
      position: { q: 1, r: 0 },
      weapons: [weapon({ damage: 20 }), weapon({ damage: 20 })],
    });
    const smallEnemy = unit({
      unitId: 'small',
      position: { q: 2, r: 0 },
      weapons: [weapon({ damage: 1 })],
    });
    const friendly = [
      unit({ unitId: 'f1', position: { q: 0, r: 0 } }),
      unit({ unitId: 'f2', position: { q: 0, r: 1 } }),
    ];

    const map = buildThreatMap(friendly, [smallEnemy, bigEnemy]);

    expect(map).toHaveLength(2);
    expect(map[0].enemyId).toBe('big');
    expect(map[1].enemyId).toBe('small');
    expect(map[0].aggregateThreat).toBeGreaterThan(map[1].aggregateThreat);
  });

  it('aggregation is independent of input order', () => {
    const e1 = unit({
      unitId: 'e1',
      position: { q: 1, r: 0 },
      weapons: [weapon({ damage: 12 })],
    });
    const e2 = unit({
      unitId: 'e2',
      position: { q: 2, r: 0 },
      weapons: [weapon({ damage: 7 })],
    });
    const f1 = unit({ unitId: 'f1', position: { q: 0, r: 0 } });
    const f2 = unit({ unitId: 'f2', position: { q: 0, r: 2 } });

    const a = buildThreatMap([f1, f2], [e1, e2]);
    const b = buildThreatMap([f2, f1], [e2, e1]);

    expect(a).toEqual(b);
  });

  it('engageableBy excludes friendly units that cannot reach the enemy', () => {
    // `near` is within the 9-hex long range of f1; `far` is well beyond it.
    const enemy = unit({
      unitId: 'enemy',
      position: { q: 5, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });
    const inRange = unit({ unitId: 'inRange', position: { q: 0, r: 0 } });
    const outOfRange = unit({
      unitId: 'outOfRange',
      position: { q: 40, r: 0 },
    });

    const map = buildThreatMap([inRange, outOfRange], [enemy]);

    expect(map[0].engageableBy).toEqual(['inRange']);
  });

  it('skips destroyed units on both sides', () => {
    const liveEnemy = unit({ unitId: 'live', position: { q: 1, r: 0 } });
    const deadEnemy = unit({
      unitId: 'dead',
      position: { q: 1, r: 1 },
      destroyed: true,
    });
    const friendly = [unit({ unitId: 'f1' })];

    const map = buildThreatMap(friendly, [liveEnemy, deadEnemy]);

    expect(map.map((e) => e.enemyId)).toEqual(['live']);
  });
});

// =============================================================================
// Focus-Fire Coordination
// =============================================================================

describe('coordinateFire — focus-fire assignment', () => {
  it('concentrates two units on a target one cannot finish alone', () => {
    // The target needs ~30 durability; each friendly does ~5 raw damage at
    // gunnery 4 / range <=3 (hit prob ~0.67) => ~3.3 expected each. One unit
    // cannot finish it; two still cannot — but a low-durability target makes
    // the finish reachable. Use a target both can finish together.
    const target = unit({
      unitId: 'target',
      position: { q: 1, r: 0 },
      structureState: durability(6),
      weapons: [weapon({ damage: 5 })],
    });
    const f1 = unit({
      unitId: 'f1',
      position: { q: 0, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });
    const f2 = unit({
      unitId: 'f2',
      position: { q: 2, r: 0 },
      weapons: [weapon({ damage: 5 })],
    });

    const friendly = [f1, f2];
    const enemies = [target];
    const threatMap = buildThreatMap(friendly, enemies);
    const result = coordinateFire(friendly, enemies, threatMap);

    expect(result.assignments.get('f1')).toBe('target');
    expect(result.assignments.get('f2')).toBe('target');
    expect(result.finishableTargets).toContain('target');
  });

  it('releases surplus firepower to the next-ranked threat', () => {
    // `weak` is finishable by a single high-damage unit; the surplus units
    // should be released to the next threat rather than dog-piling `weak`.
    const weak = unit({
      unitId: 'weak',
      position: { q: 1, r: 0 },
      structureState: durability(2),
      weapons: [weapon({ damage: 30 })], // high threat -> ranks first
    });
    const other = unit({
      unitId: 'other',
      position: { q: 2, r: 0 },
      structureState: durability(40),
      weapons: [weapon({ damage: 10 })],
    });
    // Three friendly units, each able to single-handedly finish `weak`.
    const f1 = unit({
      unitId: 'f1',
      position: { q: 0, r: 0 },
      weapons: [weapon({ damage: 30 })],
    });
    const f2 = unit({
      unitId: 'f2',
      position: { q: 0, r: 1 },
      weapons: [weapon({ damage: 30 })],
    });
    const f3 = unit({
      unitId: 'f3',
      position: { q: 1, r: 1 },
      weapons: [weapon({ damage: 30 })],
    });

    const friendly = [f1, f2, f3];
    const enemies = [weak, other];
    const threatMap = buildThreatMap(friendly, enemies);
    const result = coordinateFire(friendly, enemies, threatMap);

    // `weak` ranks first and is finishable by f1 alone. f2 and f3 must NOT
    // pile onto it — they are released to `other`.
    const onWeak = Array.from(result.assignments.entries()).filter(
      ([, t]) => t === 'weak',
    );
    expect(onWeak).toHaveLength(1);
    expect(result.finishableTargets).toContain('weak');
    expect(result.assignments.get('f2')).toBe('other');
    expect(result.assignments.get('f3')).toBe('other');
  });

  it('concentrates on the highest-threat target the most units can engage when nothing is finishable', () => {
    // No target is finishable (huge durability). The lance should still
    // concentrate on the highest-aggregate-threat target.
    const bigThreat = unit({
      unitId: 'bigThreat',
      position: { q: 1, r: 0 },
      structureState: durability(500),
      weapons: [weapon({ damage: 40 })],
    });
    const smallThreat = unit({
      unitId: 'smallThreat',
      position: { q: 2, r: 0 },
      structureState: durability(500),
      weapons: [weapon({ damage: 2 })],
    });
    const f1 = unit({ unitId: 'f1', position: { q: 0, r: 0 } });
    const f2 = unit({ unitId: 'f2', position: { q: 0, r: 1 } });

    const friendly = [f1, f2];
    const enemies = [bigThreat, smallThreat];
    const threatMap = buildThreatMap(friendly, enemies);
    const result = coordinateFire(friendly, enemies, threatMap);

    expect(result.finishableTargets).toHaveLength(0);
    expect(result.assignments.get('f1')).toBe('bigThreat');
    expect(result.assignments.get('f2')).toBe('bigThreat');
  });

  it('expectedDamage is zero for an out-of-range target', () => {
    const attacker = unit({ unitId: 'a', position: { q: 0, r: 0 } });
    const farTarget = unit({ unitId: 't', position: { q: 50, r: 0 } });
    expect(expectedDamage(attacker, farTarget)).toBe(0);
  });

  it('remainingDurability sums armour and internal structure', () => {
    const target = unit({ unitId: 't', structureState: durability(20) });
    expect(remainingDurability(target)).toBe(20);
  });
});

// =============================================================================
// Per-Lance Turn Plan
// =============================================================================

describe('planTurn — per-lance turn plan', () => {
  it('produces a single plan carrying threat map, fire assignment, and centroid', () => {
    const friendly = [
      unit({ unitId: 'f1', position: { q: 0, r: 0 } }),
      unit({ unitId: 'f2', position: { q: 2, r: 0 } }),
      unit({ unitId: 'f3', position: { q: 0, r: 2 } }),
      unit({ unitId: 'f4', position: { q: 2, r: 2 } }),
    ];
    const enemies = [
      unit({ unitId: 'e1', position: { q: 5, r: 0 } }),
      unit({ unitId: 'e2', position: { q: 6, r: 0 } }),
    ];

    const plan = planTurn(friendly, enemies);

    expect(plan.threatMap.length).toBe(2);
    expect(plan.fireAssignment).toBeDefined();
    expect(plan.lanceCentroid).toEqual({ q: 1, r: 1 });
  });

  it('is deterministic — two calls on the same unit set yield identical plans', () => {
    const friendly = [
      unit({ unitId: 'f1', position: { q: 0, r: 0 } }),
      unit({ unitId: 'f2', position: { q: 3, r: 0 } }),
    ];
    const enemies = [
      unit({ unitId: 'e1', position: { q: 5, r: 0 } }),
      unit({ unitId: 'e2', position: { q: 6, r: 1 } }),
    ];

    const a = planTurn(friendly, enemies);
    const b = planTurn(friendly, enemies);

    expect(a.threatMap).toEqual(b.threatMap);
    expect(a.lanceCentroid).toEqual(b.lanceCentroid);
    expect(Array.from(a.fireAssignment.assignments.entries())).toEqual(
      Array.from(b.fireAssignment.assignments.entries()),
    );
    expect(a.fireAssignment.finishableTargets).toEqual(
      b.fireAssignment.finishableTargets,
    );
  });

  it('the returned plan is frozen — a per-unit decision cannot mutate it', () => {
    const plan = planTurn([unit({ unitId: 'f1' })], [unit({ unitId: 'e1' })]);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it('computeLanceCentroid snaps the mean position to a valid hex', () => {
    const centroid = computeLanceCentroid([
      unit({ unitId: 'f1', position: { q: 0, r: 0 } }),
      unit({ unitId: 'f2', position: { q: 4, r: 0 } }),
      unit({ unitId: 'f3', position: { q: 0, r: 4 } }),
      unit({ unitId: 'f4', position: { q: 4, r: 4 } }),
    ]);
    expect(centroid).toEqual({ q: 2, r: 2 });
  });

  it('computeLanceCentroid returns the origin for an empty lance', () => {
    expect(computeLanceCentroid([])).toEqual({ q: 0, r: 0 });
  });

  it('computeLanceCentroid ignores destroyed units', () => {
    const centroid = computeLanceCentroid([
      unit({ unitId: 'f1', position: { q: 0, r: 0 } }),
      unit({ unitId: 'f2', position: { q: 4, r: 0 } }),
      unit({
        unitId: 'dead',
        position: { q: 100, r: 100 },
        destroyed: true,
      }),
    ]);
    expect(centroid).toEqual({ q: 2, r: 0 });
  });
});
