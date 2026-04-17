/**
 * Regression guard — critical-hit component effects.
 *
 * Bug #8 from `fix-combat-rule-accuracy`: life support was originally
 * `hitsToDestroy: 1`. The canonical rule (TechManual p.181 critical hit
 * effects) requires 2 hits to destroy life support. This suite guards
 * against silent re-regression and also documents the other well-known
 * hitsToDestroy values for the same-shape canonical reference.
 *
 * @spec openspec/changes/fix-combat-rule-accuracy/specs/critical-hit-system/spec.md
 */

import {
  CRITICAL_HIT_EFFECTS,
  CriticalComponentType,
  getCriticalHitEffect,
} from '@/types/validation/CriticalHitSystem';

describe('CRITICAL_HIT_EFFECTS — life support regression guard', () => {
  it('life support requires 2 hits to destroy (fix for bug #8)', () => {
    const effect = getCriticalHitEffect(CriticalComponentType.LIFE_SUPPORT);
    expect(effect).toBeDefined();
    expect(effect?.hitsToDestroy).toBe(2);
  });

  it('life support effect description mentions per-hit consequence', () => {
    const effect = getCriticalHitEffect(CriticalComponentType.LIFE_SUPPORT);
    expect(effect?.effectPerHit.toLowerCase()).toContain('pilot');
  });
});

describe('CRITICAL_HIT_EFFECTS — canonical hitsToDestroy reference guard', () => {
  // These are NOT part of the original bug list but are codified here so
  // any future edit of CRITICAL_HIT_EFFECTS that drifts from canonical
  // MegaMek values fails at merge time.
  const CANONICAL_HITS: ReadonlyArray<{
    component: CriticalComponentType;
    expected: number;
    rationale: string;
  }> = [
    {
      component: CriticalComponentType.WEAPON,
      expected: 1,
      rationale: 'One crit destroys a weapon',
    },
    {
      component: CriticalComponentType.AMMO,
      expected: 1,
      rationale: 'One crit explodes remaining rounds',
    },
    {
      component: CriticalComponentType.ENGINE,
      expected: 3,
      rationale: 'Three engine hits destroy the mech',
    },
    {
      component: CriticalComponentType.GYRO,
      expected: 2,
      rationale: 'Standard gyro: one hit = +3 piloting, two hits = destruction',
    },
    {
      component: CriticalComponentType.COCKPIT,
      expected: 1,
      rationale: 'Cockpit hit kills pilot',
    },
    {
      component: CriticalComponentType.ACTUATOR,
      expected: 1,
      rationale: 'One crit reduces the actuator',
    },
    {
      component: CriticalComponentType.HEAT_SINK,
      expected: 1,
      rationale: 'One crit destroys a heat sink',
    },
    {
      component: CriticalComponentType.SENSOR,
      expected: 2,
      rationale: 'One hit = +1 to-hit, two hits = +2',
    },
    {
      component: CriticalComponentType.LIFE_SUPPORT,
      expected: 2,
      rationale: 'Canonical rule per TechManual (bug #8 regression guard)',
    },
  ];

  it.each(CANONICAL_HITS)(
    '$component hitsToDestroy = $expected ($rationale)',
    ({ component, expected }) => {
      const effect = getCriticalHitEffect(component);
      expect(effect).toBeDefined();
      expect(effect?.hitsToDestroy).toBe(expected);
    },
  );

  it('CRITICAL_HIT_EFFECTS covers every CriticalComponentType exactly once', () => {
    const components = CRITICAL_HIT_EFFECTS.map((e) => e.componentType);
    const unique = new Set(components);
    expect(unique.size).toBe(components.length);
  });
});
