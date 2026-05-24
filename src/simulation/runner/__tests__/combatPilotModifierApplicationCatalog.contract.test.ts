import { QUIRK_CATALOG } from '@/utils/gameplay/quirkModifiers';
import { SPA_CATALOG } from '@/utils/gameplay/spaModifiers';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import {
  PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
  PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT,
} from '../CombatPilotModifierApplicationSupport';

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

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

function assignedSpaIds(): readonly string[] {
  return uniqueSorted(
    Object.values(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
      (assignment) => assignment.spaIds,
    ),
  );
}

function assignedQuirkIds(): readonly string[] {
  return uniqueSorted(
    Object.values(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
      (assignment) => assignment.quirkIds,
    ),
  );
}

function nonIntegratedIdsAssignedToIntegratedResolvers(): readonly string[] {
  const resolverSupport = PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;
  const spaSupport = SPA_COMBAT_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;
  const quirkSupport = QUIRK_COMBAT_SUPPORT as Record<
    string,
    ICombatFeatureSupportEntry
  >;

  return Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS)
    .flatMap(([resolverId, assignment]) => {
      if (resolverSupport[resolverId]?.level !== 'integrated') return [];

      return [
        ...assignment.spaIds
          .filter((spaId) => spaSupport[spaId]?.level !== 'integrated')
          .map((spaId) => `${resolverId}.spa.${spaId}`),
        ...assignment.quirkIds
          .filter((quirkId) => quirkSupport[quirkId]?.level !== 'integrated')
          .map((quirkId) => `${resolverId}.quirk.${quirkId}`),
      ];
    })
    .sort();
}

describe('BattleMech pilot SPA and quirk resolver application catalog', () => {
  it('catalogs every resolver family that can apply pilot abilities or quirks', () => {
    expect(sortedKeys(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT)).toEqual(
      [
        'anti-mek-actuator-application',
        'called-shot-application',
        'campaign-maintenance-application',
        'cluster-hitter-application',
        'consciousness-application',
        'critical-prevention-application',
        'edge-application',
        'heat-application',
        'indirect-fire-spa-application',
        'initiative-application',
        'movement-application',
        'multi-target-penalty-application',
        'physical-damage-application',
        'physical-restriction-application',
        'physical-to-hit-application',
        'psr-application',
        'psr-spa-application',
        'ranged-to-hit-calculation',
        'ranged-to-hit-state-hydration',
        'sandblaster-application',
        'target-priority-application',
        'weapon-to-hit-quirk-application',
      ].sort(),
    );
    expect(supportGaps(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT)).toEqual([]);
  });

  it('assigns every cataloged SPA and quirk to at least one combat resolver family', () => {
    expect(assignedSpaIds()).toEqual(sortedKeys(SPA_CATALOG));
    expect(assignedSpaIds()).toEqual(sortedKeys(SPA_COMBAT_SUPPORT));
    expect(assignedQuirkIds()).toEqual(sortedKeys(QUIRK_CATALOG));
    expect(assignedQuirkIds()).toEqual(sortedKeys(QUIRK_COMBAT_SUPPORT));
  });

  it('does not assign unknown SPA or quirk ids to resolver families', () => {
    const unknownAssignments = Object.entries(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS,
    ).flatMap(([resolverId, assignment]) => [
      ...assignment.spaIds
        .filter((spaId) => SPA_CATALOG[spaId] === undefined)
        .map((spaId) => `${resolverId}.spa.${spaId}`),
      ...assignment.quirkIds
        .filter((quirkId) => QUIRK_CATALOG[quirkId] === undefined)
        .map((quirkId) => `${resolverId}.quirk.${quirkId}`),
    ]);

    expect(unknownAssignments).toEqual([]);
  });

  it('does not hide non-integrated SPA or quirk gaps behind integrated resolver families', () => {
    expect(nonIntegratedIdsAssignedToIntegratedResolvers()).toEqual([]);
  });

  it('separates pure helper support from missing runner/application plumbing', () => {
    expect(
      supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'ranged-to-hit-calculation',
        'ranged-to-hit-state-hydration',
        'cluster-hitter-application',
        'consciousness-application',
        'heat-application',
        'indirect-fire-spa-application',
        'physical-damage-application',
        'physical-restriction-application',
        'physical-to-hit-application',
        'psr-application',
        'weapon-to-hit-quirk-application',
      ].sort(),
    );
    expect(
      supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual(
      [
        'movement-application',
        'multi-target-penalty-application',
        'target-priority-application',
      ].sort(),
    );
    expect(
      supportIdsByLevel(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(
      expect.arrayContaining([
        'critical-prevention-application',
        'psr-spa-application',
        'sandblaster-application',
      ]),
    );
  });

  it('keeps ranged to-hit feature support distinct from ranged attack state hydration', () => {
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(
      expect.arrayContaining([
        'weapon-specialist',
        'gunnery-specialist',
        'sniper',
        'blood-stalker',
        'multi-tasker',
        'range-master',
        'hopping-jack',
        'jumping-jack',
        'dodge-maneuver',
        'tm_forest_ranger',
        'tm_swamp_beast',
        'pain-resistance',
      ]),
    );
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].quirkIds,
    ).toEqual(
      expect.arrayContaining([
        'improved_targeting_short',
        'poor_targeting_long',
        'distracting',
        'low_profile',
        'sensor_ghosts',
        'multi_trac',
      ]),
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration']
        .level,
    ).toBe('integrated');
  });

  it('keeps source-backed Multi-Tasker distinct from local Multi-Target', () => {
    expect(SPA_COMBAT_SUPPORT['multi-tasker']).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['multi-target']).toMatchObject({
      level: 'unsupported',
    });
    expect(SPA_COMBAT_SUPPORT['multi-target'].gap).toContain(
      'Multi-Tasker/multi_tasker',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ],
    ).toMatchObject({ level: 'unsupported' });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['multi-target-penalty-application']
        .gap,
    ).toContain('source-backed MegaMek');

    const multiTaskerRefs = SPA_COMBAT_SUPPORT['multi-tasker'].sourceRefs ?? [];
    expect(multiTaskerRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker',
      'MegaMek OptionsConstants defines the source-backed Multi-Tasker SPA id as multi_tasker',
    ]);
    expect(SPA_COMBAT_SUPPORT['multi-target'].sourceRefs).toEqual(
      multiTaskerRefs,
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
      'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    ]);
  });

  it('pins Dodge Maneuver to MegaMek target dodging semantics', () => {
    const dodgeRefs = SPA_COMBAT_SUPPORT['dodge-maneuver'].sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['dodge-maneuver']).toMatchObject({
      level: 'integrated',
    });
    expect(dodgeRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute applies +2 when the target is a Mek with Dodge Maneuver and target.dodging is true',
      'MegaMek OptionsConstants defines the source-backed Dodge Maneuver SPA id as dodge_maneuver',
    ]);
  });

  it('pins Jumping Jack and Hopping Jack to MegaMek jump attacker penalties', () => {
    const jumpingRefs = SPA_COMBAT_SUPPORT['jumping-jack'].sourceRefs ?? [];
    const hoppingRefs = SPA_COMBAT_SUPPORT['hopping-jack'].sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['jumping-jack']).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['hopping-jack']).toMatchObject({
      level: 'integrated',
    });
    expect(jumpingRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getAttackerMovementModifier applies +1 for Jumping Jack, +2 for Hopping Jack, and +3 for plain jump movement',
      'MegaMek OptionsConstants defines the source-backed Hopping Jack and Jumping Jack SPA ids as hopping_jack and jumping_jack',
    ]);
    expect(hoppingRefs).toEqual(jumpingRefs);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(expect.arrayContaining(['hopping-jack', 'jumping-jack']));
  });

  it('pins Terrain Master Frogman physical to-hit to MegaMek water-depth semantics', () => {
    const frogmanRefs = SPA_COMBAT_SUPPORT.tm_frogman.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.tm_frogman).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain('tm_frogman');
    expect(frogmanRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.modifyPhysicalBTHForAdvantages applies -1 Frogman for Mek or ProtoMek attackers in water deeper than level 1',
      'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water',
      'MegaMek OptionsConstants defines the source-backed Terrain Master: Frogman SPA id as tm_frogman',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['physical-to-hit-application'].spaIds,
    ).toEqual(expect.arrayContaining(['melee-specialist', 'tm_frogman']));
  });

  it('pins PSR SPA application to MegaMek skidding, quad, Terrain Master PSR, and visible gap semantics', () => {
    const psrSpaRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application']
        .sourceRefs ?? [];

    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'],
    ).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('Frogman water-entry relief'),
    });
    expect(psrSpaRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
      'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
      'MegaMek QuadMek.addEntityBonuses applies -1 Animal Mimicry to quad Mek piloting rolls.',
      'MegaMek OptionsConstants defines PILOT_ANIMAL_MIMIC as animal_mimic.',
      'MegaMek Entity.checkWaterMove applies water-depth PSR modifiers and -1 Frogman for Mek or ProtoMek units entering depth-2+ water.',
      'MegaMek OptionsConstants defines PILOT_TM_FROGMAN as tm_frogman.',
      'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
      'MegaMek OptionsConstants defines PILOT_TM_MOUNTAINEER as tm_mountaineer.',
      'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
      'MegaMek Terrain.getBogDownModifier makes swamp a BattleMech bog-down terrain while mud does not bog down biped or quad movement modes.',
      'MegaMek OptionsConstants defines PILOT_TM_SWAMP_BEAST as tm_swamp_beast.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).toEqual(
      expect.arrayContaining([
        'tm_frogman',
        'tm_mountaineer',
        'tm_swamp_beast',
      ]),
    );
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).not.toContain('cross-country');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'].gap,
    ).not.toContain('Cross-Country');
  });

  it('pins Cross-Country to MegaMek combat-vehicle movement scope', () => {
    const crossCountryRefs =
      SPA_COMBAT_SUPPORT['cross-country'].sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['cross-country']).toMatchObject({
      level: 'unsupported',
      gap: expect.stringContaining('combat-vehicle'),
    });
    expect(SPA_COMBAT_SUPPORT['cross-country'].gap).toContain(
      'BattleMech terrain PSR',
    );
    expect(crossCountryRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Terrain.movementCost applies Cross-Country only inside ground combat-vehicle terrain movement-cost gates.',
      'MegaMek Tank.isLocationProhibited applies Cross-Country to tracked, wheeled, and hover combat-vehicle passability gates.',
      'MegaMek OptionsConstants defines PILOT_CROSS_COUNTRY as cross_country.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'],
    ).toMatchObject({
      level: 'unsupported',
      gap: expect.stringContaining('Cross-Country combat-vehicle'),
    });
    expect(movementRefs).toEqual(expect.arrayContaining([...crossCountryRefs]));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).toEqual(expect.arrayContaining(['cross-country']));
  });

  it('pins Heavy Lifter to MegaMek lift-capacity scope', () => {
    const heavyLifterRefs = SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT['heavy-lifter']).toMatchObject({
      level: 'unsupported',
      gap: expect.stringContaining('lift capacity by 1.5'),
    });
    expect(SPA_COMBAT_SUPPORT['heavy-lifter'].gap).toContain(
      'no carry/throw-object physical combat action path',
    );
    expect(heavyLifterRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek MekWithArms.maxGroundObjectTonnage multiplies BattleMech ground-object lift capacity by 1.5 for Heavy Lifter.',
      'MegaMek ProtoMek.maxGroundObjectTonnage multiplies ProtoMek ground-object lift capacity by 1.5 for Heavy Lifter.',
      'MegaMek OptionsConstants defines PILOT_HVY_LIFTER as hvy_lifter.',
    ]);
    expect(movementRefs).toEqual(expect.arrayContaining([...heavyLifterRefs]));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).toEqual(expect.arrayContaining(['heavy-lifter']));
  });

  it('pins Sandblaster to MegaMek cluster-table range bonuses and remaining rate-of-fire gap', () => {
    const sandblasterRefs = SPA_COMBAT_SUPPORT.sandblaster.sourceRefs ?? [];
    const applicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.sandblaster).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('+4/+3/+2'),
      gap: expect.stringContaining('UAC/RAC'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application'],
    ).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('designated weapon type'),
      gap: expect.stringContaining('rate-of-fire'),
    });
    expect(sandblasterRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek WeaponHandler.getClusterModifiers applies Sandblaster as +4 short, +3 medium, or +2 long cluster-table modifiers for the designated weapon, taking precedence over Cluster Hitter.',
      'MegaMek PilotSPAHelper limits Sandblaster designations to UAC, LB-X AC, TacOps rapid-fire AC, and damage-by-cluster-table weapons.',
      'MegaMek OptionsConstants defines GUNNERY_SANDBLASTER as sandblaster.',
    ]);
    expect(applicationRefs).toEqual(sandblasterRefs);
  });

  it('pins Terrain Master Mountaineer rubble PSR relief to MegaMek semantics', () => {
    const mountaineerRefs = SPA_COMBAT_SUPPORT.tm_mountaineer.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.tm_mountaineer).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('Mountaineer'),
      gap: expect.stringContaining('movement-cost'),
    });
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain(
      'tm_mountaineer',
    );
    expect(mountaineerRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
      'MegaMek OptionsConstants defines Terrain Master: Mountaineer as tm_mountaineer.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
    ).toEqual(expect.arrayContaining(['tm_mountaineer']));
  });

  it('pins Terrain Master defender to-hit variants to MegaMek terrain and movement semantics', () => {
    const forestRefs = SPA_COMBAT_SUPPORT.tm_forest_ranger.sourceRefs ?? [];
    const swampRefs = SPA_COMBAT_SUPPORT.tm_swamp_beast.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.tm_forest_ranger).toMatchObject({
      level: 'integrated',
    });
    expect(SPA_COMBAT_SUPPORT.tm_swamp_beast).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('to-hit'),
    });
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain(
      'tm_forest_ranger',
    );
    expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain(
      'tm_swamp_beast',
    );
    expect(forestRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp',
      'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast SPA ids as tm_forest_ranger and tm_swamp_beast',
    ]);
    expect(swampRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Forest Ranger for walking targets in vegetation and +1 Swamp Beast for running targets in mud or swamp',
      'MegaMek Entity.checkBogDown applies -1 Swamp Beast to avoid-bogging-down piloting rolls.',
      'MegaMek OptionsConstants defines Terrain Master Forest Ranger and Swamp Beast SPA ids as tm_forest_ranger and tm_swamp_beast',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(expect.arrayContaining(['tm_forest_ranger', 'tm_swamp_beast']));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration']
        .spaIds,
    ).toEqual(expect.arrayContaining(['tm_forest_ranger', 'tm_swamp_beast']));
  });

  it('keeps local called-shot helpers out of MegaMek-backed SPA claims', () => {
    expect(SPA_COMBAT_SUPPORT.marksman).toMatchObject({
      level: 'helper-only',
    });
    expect(SPA_COMBAT_SUPPORT.sharpshooter).toMatchObject({
      level: 'helper-only',
    });
    expect(SPA_COMBAT_SUPPORT.marksman.gap).toContain(
      'not Marksman as a called-shot SPA',
    );
    expect(SPA_COMBAT_SUPPORT.sharpshooter.gap).toContain(
      'Sharpshooter constant commented out',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application'].gap,
    ).toContain('not Marksman/Sharpshooter reduction');
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'called-shot-application'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    ]);
  });

  it('keeps source-backed pilot modifier refs commit-pinned', () => {
    const refs = [
      ...(SPA_COMBAT_SUPPORT['multi-tasker'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['multi-target'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['dodge-maneuver'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['hopping-jack'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['jumping-jack'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_frogman.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_forest_ranger.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_mountaineer.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_swamp_beast.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['cross-country'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-calculation']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'ranged-to-hit-state-hydration'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application']
        .sourceRefs ?? []),
    ];

    expect(refs.length).toBeGreaterThan(0);
    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });
});
