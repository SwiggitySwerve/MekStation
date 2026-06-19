import type {
  CombatSupportSourceRef,
  ICombatFeatureSupportEntry,
} from './combatPilotModifierApplicationCatalog.test-helpers';

import {
  CANONICAL_SPA_COMBAT_SCOPE_SUPPORT,
  INTEGRATED_RESOLVER_SPA_ASSIGNMENT_EXCEPTIONS,
  PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
  QUIRK_CATALOG,
  QUIRK_COMBAT_SUPPORT,
  SPA_CATALOG,
  SPA_COMBAT_SUPPORT,
  assignedQuirkIds,
  assignedResolverIdsForSpaId,
  assignedSpaIds,
  canonicalSpaSourceCitations,
  helperOnlyCanonicalSpaAssignments,
  isAllowedIntegratedResolverSpaAssignment,
  nonIntegratedIdsAssignedToIntegratedResolvers,
  sortedKeys,
  sourceRefsFrom,
  supportGaps,
  supportIdsByLevel,
  uniqueSorted,
} from './combatPilotModifierApplicationCatalog.test-helpers';

it('pins heat-driven SPA support to source-backed and local-only boundaries', () => {
  const hotDogRefs = SPA_COMBAT_SUPPORT['hot-dog'].sourceRefs ?? [];
  const someLikeItHotRefs =
    SPA_COMBAT_SUPPORT['some-like-it-hot'].sourceRefs ?? [];
  const weaponCoolingRefs =
    QUIRK_COMBAT_SUPPORT.improved_cooling.sourceRefs ?? [];
  const heatApplicationRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT['hot-dog']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('heat-induced ammo-explosion'),
  });
  expect(SPA_COMBAT_SUPPORT['hot-dog'].evidence).toContain(
    'opt-in MaxTech pilot heat-damage',
  );
  expect(SPA_COMBAT_SUPPORT['hot-dog'].evidence).toContain(
    'opt-in MaxTech critical-damage',
  );
  expect(hotDogRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek HeatResolver sets PILOT_HOT_DOG to hotDogMod = 1 before resolving heat effects.',
    'MegaMek HeatResolver subtracts hotDogMod from startup and shutdown target numbers instead of shifting the shutdown heat threshold.',
    'MegaMek HeatResolver subtracts hotDogMod from heat ammo-explosion target numbers plus optional MaxTech heat-scale pilot-damage and critical-damage target numbers; default life-support heat damage remains threshold-based.',
    'MegaMek OptionsConstants defines PILOT_HOT_DOG as hot_dog.',
  ]);

  expect(SPA_COMBAT_SUPPORT['cool-under-fire']).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('getCoolUnderFireHeatReduction'),
    gap: expect.stringContaining('No MegaMek source-backed'),
  });
  expect(SPA_COMBAT_SUPPORT['cool-under-fire'].evidence).toContain(
    'without being consumed by BattleMech heat resolution',
  );
  expect(
    SPA_COMBAT_SUPPORT['cool-under-fire'].sourceRefs?.some(
      (sourceRef) => sourceRef.kind === 'mekstation-deviation',
    ),
  ).toBe(true);

  expect(SPA_COMBAT_SUPPORT['some-like-it-hot']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('AttackDeclared heat modifiers'),
  });
  expect(someLikeItHotRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Entity.getHeatFiringModifier reduces positive heat firing modifiers by 1 for UNOFFICIAL_SOME_LIKE_IT_HOT.',
    'MegaMek OptionsConstants defines UNOFFICIAL_SOME_LIKE_IT_HOT as some_like_it_hot.',
  ]);

  expect(QUIRK_COMBAT_SUPPORT.improved_cooling).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('max(1, heat - 1)'),
  });
  expect(weaponCoolingRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek WeaponMounted.getCurrentHeat applies weapon cooling quirks after shot/weapon multiplication: Improved Cooling floors heat at max(1, heat - 1), Poor Cooling adds 1, and No Cooling adds 2.',
    'MegaMek WeaponQuirks registers Improved Cooling, Poor Cooling, and No Cooling as weapon quirk options.',
    'MegaMek WeaponQuirks disallows weapon cooling quirks for club weapons, non-heat weapons, conventional infantry, tanks, battle armor, and ProtoMeks.',
    'MegaMek OptionsConstants defines weapon cooling quirk ids as imp_cooling, poor_cooling, and no_cooling.',
  ]);
  expect(QUIRK_COMBAT_SUPPORT.poor_cooling.sourceRefs).toEqual(
    weaponCoolingRefs,
  );
  expect(QUIRK_COMBAT_SUPPORT.no_cooling.sourceRefs).toEqual(weaponCoolingRefs);

  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('source-backed Some Like It Hot'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].evidence,
  ).toContain('leaving local Cool Under Fire unconsumed');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].gap,
  ).toBeUndefined();
  expect(heatApplicationRefs).toEqual([
    ...hotDogRefs,
    ...someLikeItHotRefs,
    ...weaponCoolingRefs,
  ]);
});

it('pins local-only SPA gaps to MegaMek registry and MekStation deviation refs', () => {
  const localOnlySpaIds = [
    'acrobat',
    'natural-grace',
    'speed-demon',
    'combat-intuition',
    'cool-under-fire',
    'evasive',
    'multi-target',
    'iron-will',
    'antagonizer',
  ] as const;

  localOnlySpaIds.forEach((spaId) => {
    const support = SPA_COMBAT_SUPPORT[spaId];
    expect(support.sourceRefs?.map(({ citation }) => citation)).toEqual([
      'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
      'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
      'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
    ]);
    expect(
      support.sourceRefs?.some(
        (sourceRef) =>
          sourceRef.kind === 'mekstation-deviation' &&
          sourceRef.url.includes(
            'src/utils/gameplay/spaModifiers/catalog.ts#L',
          ),
      ),
    ).toBe(true);
  });

  expect(
    localOnlySpaIds.map((spaId) => SPA_COMBAT_SUPPORT[spaId].level),
  ).toEqual([
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
    'out-of-scope',
  ]);
  expect(SPA_COMBAT_SUPPORT.evasive.gap).toContain(
    'source-backed evasion remains covered by the integrated optional TacOps Evade movement action row',
  );
  expect(SPA_COMBAT_SUPPORT['cool-under-fire'].gap).toContain(
    'outside the official BattleMech validation blocker inventory',
  );
  expect(SPA_COMBAT_SUPPORT['combat-intuition'].gap).toContain(
    'source-backed combat authority',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['target-priority-application'],
  ).toMatchObject({
    level: 'out-of-scope',
    sourceRefs: SPA_COMBAT_SUPPORT.antagonizer.sourceRefs,
  });
});
