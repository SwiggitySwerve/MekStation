import type { IAttackInvalidPayload } from '@/types/gameplay/GameSessionAttackEvents';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from '../CombatFeatureSupport';

import {
  ATTACK_INVALIDATION_REASON_SUPPORT,
  ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT,
  INVALID_TARGET_STATE_SUPPORT,
  type AttackInvalidationSideEffectGuard,
  type InvalidTargetState,
} from '../CombatAttackInvalidationSupport';

const ATTACK_INVALID_REASONS = [
  'InvalidTarget',
  'NoLineOfSight',
  'OutOfAmmo',
  'OutOfRange',
  'SameHex',
  'UnknownWeapon',
  'WeaponDestroyed',
  'WeaponJammed',
] as const satisfies readonly IAttackInvalidPayload['reason'][];

const INVALID_TARGET_STATES = [
  'destroyed-target',
  'ejected-target',
  'missing-target',
  'retreated-target',
  'same-side-target',
] as const satisfies readonly InvalidTargetState[];

const NO_SIDE_EFFECT_GUARDS = [
  'no-ammo-consumed',
  'no-attack-declared',
  'no-attack-resolved',
  'no-damage-applied',
  'no-fired-weapon-state',
  'no-heat-spent',
] as const satisfies readonly AttackInvalidationSideEffectGuard[];

const MEGAMEK_COMBAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

function expectPinnedMegaMekRefs(
  sourceRefs: readonly ICombatFeatureSourceReference[],
): void {
  expect(sourceRefs.length).toBeGreaterThan(0);
  sourceRefs.forEach((sourceRef) => {
    expect(sourceRef.kind).toBe('megamek-source');
    expect(sourceRef.sourceVersion).toBe(MEGAMEK_COMBAT_SOURCE_VERSION);
    expect(sourceRef.url).toContain('github.com/MegaMek/megamek/blob/');
    expect(sourceRef.url).toContain(MEGAMEK_COMBAT_SOURCE_VERSION);
    expect(sourceRef.url).toMatch(/#L\d+(?:-L\d+)?$/);
    expect(sourceRef.citation.trim().length).toBeGreaterThan(0);
  });
}

describe('BattleMech attack invalidation support catalog', () => {
  it('catalogs every AttackInvalid reason emitted by runner weapon attacks', () => {
    expect(sortedKeys(ATTACK_INVALIDATION_REASON_SUPPORT)).toEqual([
      ...ATTACK_INVALID_REASONS,
    ]);
    expect(supportGaps(ATTACK_INVALIDATION_REASON_SUPPORT)).toEqual([]);
    expect(
      Object.values(ATTACK_INVALIDATION_REASON_SUPPORT).every(
        (entry) => entry.level === 'integrated',
      ),
    ).toBe(true);
  });

  it('catalogs targetability-removal states that invalidate ranged attacks', () => {
    expect(sortedKeys(INVALID_TARGET_STATE_SUPPORT)).toEqual([
      ...INVALID_TARGET_STATES,
    ]);
    expect(supportGaps(INVALID_TARGET_STATE_SUPPORT)).toEqual([]);
  });

  it('pins invalid target-state rows to MegaMek targetability/removal refs', () => {
    Object.values(INVALID_TARGET_STATE_SUPPORT).forEach((entry) => {
      expectPinnedMegaMekRefs(entry.sourceRefs ?? []);
    });

    expect(
      INVALID_TARGET_STATE_SUPPORT['missing-target'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek ComputeToHitIsImpossible returns NoTarget before ranged to-hit resolution when the target is null.',
    ]);

    expect(
      INVALID_TARGET_STATE_SUPPORT['destroyed-target'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek Game.getValidTargets only returns visible enemy entities that are targetable, deployed, on-board, non-hidden, and not the attacker.',
      'MegaMek Entity.isTargetable excludes destroyed, doomed, off-board, transported, captured, undeployed, and positionless entities from attack targetability.',
      'MegaMek Entity.isTargetable requires the target entity to be non-destroyed before it can be selected as an attack target.',
    ]);

    expect(
      INVALID_TARGET_STATE_SUPPORT['same-side-target'].sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek ComputeToHitIsImpossible rejects friendly direct attack targets when friendly-fire is disabled, except explicit coolant/special-case paths.',
      'MegaMek Entity.isEnemyOf treats an entity as never being an enemy of itself and delegates side hostility through owner/team relationships.',
    ]);

    expect(
      INVALID_TARGET_STATE_SUPPORT['retreated-target'].sourceRefs?.map(
        ({ url }) => url,
      ),
    ).toEqual(
      expect.arrayContaining([
        `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5768-L5770`,
      ]),
    );

    expect(
      INVALID_TARGET_STATE_SUPPORT['ejected-target'].sourceRefs?.map(
        ({ url }) => url,
      ),
    ).toEqual(
      expect.arrayContaining([
        `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L27130-L27367`,
      ]),
    );
  });

  it('catalogs the no-side-effects contract for invalid ranged attacks', () => {
    expect(sortedKeys(ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT)).toEqual([
      ...NO_SIDE_EFFECT_GUARDS,
    ]);
    expect(supportGaps(ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT)).toEqual([]);
  });
});
