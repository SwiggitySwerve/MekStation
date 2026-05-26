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
  'AttackerEvading',
  'AttackerSprinted',
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
const VALID_SOURCE_KINDS = new Set<string>([
  'megamek-source',
  'mekstation-deviation',
]);

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

function expectStructuredRefs(
  sourceRefs: readonly ICombatFeatureSourceReference[],
): void {
  expect(sourceRefs.length).toBeGreaterThan(0);
  sourceRefs.forEach((sourceRef) => {
    expect(VALID_SOURCE_KINDS.has(sourceRef.kind)).toBe(true);
    expect(sourceRef.citation.trim().length).toBeGreaterThan(0);
    expect(sourceRef.url.trim().length).toBeGreaterThan(0);
    expect(sourceRef.sourceVersion.trim().length).toBeGreaterThan(0);
    if (sourceRef.kind === 'megamek-source') {
      expect(sourceRef.sourceVersion).toBe(MEGAMEK_COMBAT_SOURCE_VERSION);
      expect(sourceRef.url).toContain('github.com/MegaMek/megamek/blob/');
      expect(sourceRef.url).toContain(MEGAMEK_COMBAT_SOURCE_VERSION);
      expect(sourceRef.url).toMatch(/#L\d+(?:-L\d+)?$/);
    }
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

  it('pins AttackInvalid reason rows to source or explicit deviation refs', () => {
    Object.values(ATTACK_INVALIDATION_REASON_SUPPORT).forEach((entry) => {
      expectStructuredRefs(entry.sourceRefs ?? []);
    });

    const sameHexRefs = ATTACK_INVALIDATION_REASON_SUPPORT.SameHex.sourceRefs;
    expect(sameHexRefs).toEqual([
      expect.objectContaining({
        kind: 'mekstation-deviation',
        url: 'src/simulation/runner/phases/weaponAttack.ts#L754-L769',
      }),
    ]);

    expect(
      ATTACK_INVALIDATION_REASON_SUPPORT.OutOfAmmo.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek ComputeToHitIsImpossible returns OutOfAmmo before ranged to-hit resolution when an ammo-fed weapon has no usable linked shots.',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_REASON_SUPPORT.NoLineOfSight.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek ComputeToHitIsImpossible rejects indirect fire without a spotter unless source-backed exceptions such as Oblique Attacker or mortar/artillery-cannon behavior apply.',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_REASON_SUPPORT.AttackerEvading.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek ComputeToHitIsImpossible prevents non-large-spacecraft evading attackers from firing ranged attacks.',
    ]);

    expect(
      ATTACK_INVALIDATION_REASON_SUPPORT.AttackerSprinted.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek ranged to-hit calculation makes attacks by sprinting attackers automatic failures.',
    ]);

    expect(
      ATTACK_INVALIDATION_REASON_SUPPORT.WeaponJammed.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual(
      expect.arrayContaining([
        'MegaMek Mounted.isReady requires mounted equipment to be not destroyed, not missing, not jammed, not useless, and not already fired before it can fire.',
      ]),
    );
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

  it('pins invalid ranged attack side-effect guards to MekStation source refs', () => {
    Object.values(ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT).forEach((entry) => {
      expectStructuredRefs(entry.sourceRefs ?? []);
      expect(
        entry.sourceRefs?.every(
          (sourceRef) => sourceRef.kind === 'mekstation-deviation',
        ),
      ).toBe(true);
    });

    expect(
      ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT[
        'no-attack-declared'
      ].sourceRefs?.map(({ url }) => url),
    ).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/phases/weaponAttack.ts#L643-L803',
        'src/simulation/runner/phases/weaponAttack.ts#L1006-L1208',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT[
        'no-attack-resolved'
      ].sourceRefs?.map(({ url }) => url),
    ).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/phases/weaponAttack.ts#L1006-L1208',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT['no-heat-spent'].sourceRefs?.map(
        ({ url }) => url,
      ),
    ).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/phases/weaponAttack.ts#L1178-L1229',
        'src/simulation/runner/phases/weaponAttackFiringModes.ts#L121-L137',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT[
        'no-ammo-consumed'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'MekStation consumeWeaponAmmo mutates ammoState and emits AmmoConsumed, so invalid attacks must not reach this helper.',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT[
        'no-damage-applied'
      ].sourceRefs?.map(({ url }) => url),
    ).toEqual(
      expect.arrayContaining([
        'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts#L182-L303',
      ]),
    );

    expect(
      ATTACK_INVALIDATION_SIDE_EFFECT_SUPPORT[
        'no-fired-weapon-state'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining([
        'MekStation markWeaponFiredForHeat appends the weapon id to weaponsFiredThisTurn, so invalid attacks must exit before this helper.',
      ]),
    );
  });
});
