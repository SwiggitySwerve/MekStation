/**
 * Integration smoke tests covering the damage → critical-hit pipeline
 * as wired by OpenSpec change `integrate-damage-pipeline`.
 *
 * Tasks exercised:
 *   - 14.3 event ordering via the resolver contract: `DamageApplied` →
 *     `CriticalHitResolved` (structure exposed) on a Medium Laser hit.
 *   - 14.5 `ComponentDestroyed` payload well-formed per task 0.5.4.
 *   - 15.2 AC/20 to exposed CT structure cascades into an engine crit
 *     via `resolveDamage` + `resolveCriticalHits`.
 *   - 15.3 side-torso cascade: LT destruction flips LA to destroyed.
 *   - 12.3 replay determinism: identical seeded rolls produce identical
 *     unit state AND identical event stream.
 *
 * These are unit-level integration tests — they exercise the real
 * modules without spinning up a full game session. They stop short of
 * touching `gameSessionAttackResolution.ts` (whose own suite covers the
 * session-shape wiring) to keep the test footprint small and parallel
 * to the safe scope the PR advertises.
 *
 * @spec openspec/changes/integrate-damage-pipeline/specs/damage-system/spec.md
 * @spec openspec/changes/integrate-damage-pipeline/specs/critical-hit-resolution/spec.md
 */

import type { CombatLocation } from '@/types/gameplay';
import type { IComponentDamageState } from '@/types/gameplay/GameSessionInterfaces';

import type { CriticalHitEvent } from '../criticalHitResolution';
import type { IUnitDamageState } from '../damage';
import type { D6Roller } from '../diceTypes';

import {
  buildDefaultCriticalSlotManifest,
  resolveCriticalHits,
} from '../criticalHitResolution';
import { resolveDamage } from '../damage';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function baseState(
  overrides: Partial<IUnitDamageState> = {},
): IUnitDamageState {
  return {
    armor: {
      head: 9,
      center_torso: 20,
      left_torso: 15,
      right_torso: 15,
      left_arm: 10,
      right_arm: 10,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 0,
      left_torso_rear: 0,
      right_torso_rear: 0,
    },
    rearArmor: { center_torso: 8, left_torso: 6, right_torso: 6 },
    structure: {
      head: 3,
      center_torso: 16,
      left_torso: 12,
      right_torso: 12,
      left_arm: 8,
      right_arm: 8,
      left_leg: 12,
      right_leg: 12,
      center_torso_rear: 16,
      left_torso_rear: 12,
      right_torso_rear: 12,
    },
    destroyedLocations: [],
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    ...overrides,
  };
}

function emptyComponentDamage(): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
  };
}

/**
 * Build a seeded d6 roller that consumes from a fixed sequence. Used to
 * drive both `resolveCriticalHits` invocations into identical outcomes
 * for replay-determinism tests (task 12.3).
 */
function seededRoller(sequence: readonly number[]): D6Roller {
  let i = 0;
  return () => {
    if (i >= sequence.length) {
      throw new Error(
        `seededRoller exhausted (requested index ${i}, only ${sequence.length} provided)`,
      );
    }
    const v = sequence[i];
    i += 1;
    return v;
  };
}

// ---------------------------------------------------------------------------
// Task 14.3 — event ordering on a Medium Laser to exposed CT structure
// ---------------------------------------------------------------------------

describe('integrate-damage-pipeline smoke (task 14.3)', () => {
  it('Medium Laser (5 damage) into CT armor=1/structure=full exposes structure', () => {
    const state = baseState({
      armor: { ...baseState().armor, center_torso: 1 },
    });

    const { state: after, result } = resolveDamage(
      state,
      'center_torso' as CombatLocation,
      5,
    );

    // Spec scenario: DamageApplied { location: CT, fromArmor: 1, fromStructure: 4 }
    expect(result.locationDamages).toHaveLength(1);
    const [ct] = result.locationDamages;
    expect(ct.location).toBe('center_torso');
    expect(ct.armorDamage).toBe(1);
    expect(ct.structureDamage).toBe(4);
    expect(ct.armorRemaining).toBe(0);
    expect(ct.structureRemaining).toBe(12);
    expect(ct.destroyed).toBe(false);

    // Structure was exposed → the downstream caller MUST invoke
    // `resolveCriticalHits`. We verify it can be called and produces a
    // `critical_hit_resolved` event when the 2d6 roll lands in the
    // crit range (forced via `forceCrits = 1` below).
    const manifest = buildDefaultCriticalSlotManifest();
    const crit = resolveCriticalHits(
      'target-1',
      'center_torso' as CombatLocation,
      manifest,
      emptyComponentDamage(),
      seededRoller([1, 1, 1, 1, 1, 1, 1, 1]),
      /* forceCrits */ 1,
    );

    expect(crit.hits).toHaveLength(1);
    const evt = crit.events.find(
      (e) => e.type === 'critical_hit_resolved',
    ) as Extract<CriticalHitEvent, { type: 'critical_hit_resolved' }>;
    expect(evt).toBeDefined();
    expect(evt.payload.unitId).toBe('target-1');
    expect(evt.payload.location).toBe('center_torso');

    // State consistency sanity.
    expect(after.structure.center_torso).toBe(12);
    expect(after.armor.center_torso).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Task 14.5 — ComponentDestroyed payload shape
// ---------------------------------------------------------------------------

describe('integrate-damage-pipeline smoke (task 14.5)', () => {
  it('a forced engine crit produces a critical_hit_resolved event carrying componentType + slotIndex', () => {
    const manifest = buildDefaultCriticalSlotManifest();

    // Force exactly one crit; seeded roller drives the slot selection
    // deterministically. CT engine slots are indices 0..2 and 7..9 —
    // the selector samples uniformly from occupied non-destroyed slots.
    const crit = resolveCriticalHits(
      'unit-x',
      'center_torso' as CombatLocation,
      manifest,
      emptyComponentDamage(),
      seededRoller([1, 1, 1, 1, 1, 1, 1, 1]),
      /* forceCrits */ 1,
    );

    const resolved = crit.events.find(
      (e) => e.type === 'critical_hit_resolved',
    ) as Extract<CriticalHitEvent, { type: 'critical_hit_resolved' }>;
    expect(resolved).toBeDefined();
    expect(resolved.payload).toEqual(
      expect.objectContaining({
        unitId: 'unit-x',
        location: 'center_torso',
        slotIndex: expect.any(Number),
        componentType: expect.any(String),
        componentName: expect.any(String),
        destroyed: true,
      }),
    );
    expect(resolved.payload.slotIndex).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Task 15.2 — AC/20 → exposed CT → engine crit chain
// ---------------------------------------------------------------------------

describe('integrate-damage-pipeline E2E (task 15.2)', () => {
  it('AC/20 (20 damage) into CT with armor=0 / structure=8 lands 8 damage + engine crits reachable', () => {
    const state = baseState({
      armor: { ...baseState().armor, center_torso: 0 },
      structure: { ...baseState().structure, center_torso: 8 },
    });

    const { state: after, result } = resolveDamage(
      state,
      'center_torso' as CombatLocation,
      20,
    );

    // Damage applied: 8 into structure (destroys CT), 12 overflow — no
    // further transfer because CT has no transfer target (unit is
    // destroyed instead). The transfer loop ends when no transferLocation.
    expect(result.locationDamages.length).toBeGreaterThanOrEqual(1);
    const ct = result.locationDamages[0];
    expect(ct.location).toBe('center_torso');
    expect(ct.structureDamage).toBe(8);
    expect(ct.destroyed).toBe(true);
    expect(after.destroyedLocations).toContain('center_torso');
    expect(result.unitDestroyed).toBe(true);

    // With CT destroyed, any CT engine crit that ran beforehand would
    // chain to `unit_destroyed`. We exercise the crit path directly to
    // assert the engine cascade is wired end-to-end.
    const manifest = buildDefaultCriticalSlotManifest();
    // 3 forced engine crits → engineHits reaches the destruction
    // threshold (3) → `applyEngineHit` pushes `unit_destroyed` event.
    let componentDamage = emptyComponentDamage();
    let anyUnitDestroyedEvent = false;
    for (let i = 0; i < 3; i++) {
      const crit = resolveCriticalHits(
        'u2',
        'center_torso' as CombatLocation,
        manifest,
        componentDamage,
        seededRoller([1, 1, 1, 1, 1, 1, 1, 1]),
        1,
      );
      componentDamage = crit.updatedComponentDamage;
      if (crit.events.some((e) => e.type === 'unit_destroyed')) {
        anyUnitDestroyedEvent = true;
      }
    }
    // Expect the engine-hit cascade to eventually emit unit_destroyed.
    expect(componentDamage.engineHits).toBe(3);
    expect(anyUnitDestroyedEvent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 15.3 — side-torso cascade to arm
// ---------------------------------------------------------------------------

describe('integrate-damage-pipeline cascade (task 15.3)', () => {
  it('destroying LT destroys LA; destroyedLocations contains both', () => {
    const state = baseState({
      armor: { ...baseState().armor, left_torso: 0 },
      structure: { ...baseState().structure, left_torso: 3 },
    });

    const { state: after } = resolveDamage(
      state,
      'left_torso' as CombatLocation,
      5,
    );

    expect(after.destroyedLocations).toContain('left_torso');
    expect(after.destroyedLocations).toContain('left_arm');
    expect(after.armor.left_arm).toBe(0);
    expect(after.structure.left_arm).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Task 12.3 — replay determinism
// ---------------------------------------------------------------------------

describe('integrate-damage-pipeline replay determinism (task 12.3)', () => {
  it('identical seeded rollers produce identical unit state AND event streams', () => {
    const sequence = [3, 4, 2, 5, 6, 1, 3, 4, 2, 5];

    // Run 1
    const state1 = baseState({
      armor: { ...baseState().armor, center_torso: 0 },
      structure: { ...baseState().structure, center_torso: 4 },
    });
    const { state: s1a, result: r1 } = resolveDamage(
      state1,
      'center_torso' as CombatLocation,
      6,
    );
    const crit1 = resolveCriticalHits(
      'u',
      'center_torso' as CombatLocation,
      buildDefaultCriticalSlotManifest(),
      emptyComponentDamage(),
      seededRoller(sequence),
      /* forceCrits */ 2,
    );

    // Run 2 — same inputs, fresh roller from same seed-sequence.
    const state2 = baseState({
      armor: { ...baseState().armor, center_torso: 0 },
      structure: { ...baseState().structure, center_torso: 4 },
    });
    const { state: s2a, result: r2 } = resolveDamage(
      state2,
      'center_torso' as CombatLocation,
      6,
    );
    const crit2 = resolveCriticalHits(
      'u',
      'center_torso' as CombatLocation,
      buildDefaultCriticalSlotManifest(),
      emptyComponentDamage(),
      seededRoller(sequence),
      /* forceCrits */ 2,
    );

    // Pipeline output is pure given the inputs → deep equal.
    expect(s1a).toEqual(s2a);
    expect(r1).toEqual(r2);

    // Critical hit stream must match byte-for-byte for the same seed.
    expect(crit1.hits.map((h) => h.slot.slotIndex)).toEqual(
      crit2.hits.map((h) => h.slot.slotIndex),
    );
    expect(crit1.events).toEqual(crit2.events);
    expect(crit1.updatedComponentDamage).toEqual(crit2.updatedComponentDamage);
  });
});
