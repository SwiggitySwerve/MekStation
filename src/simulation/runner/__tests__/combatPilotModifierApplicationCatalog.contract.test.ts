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
        'initiative-command-console-hydration',
        'initiative-hq-equipment-hydration',
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
        'initiative-command-console-hydration',
        'initiative-hq-equipment-hydration',
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
        'heat-application',
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
        'shaky_stick',
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

  it('pins Sensor Ghosts and weapon to-hit quirks to MegaMek attacker quirk semantics', () => {
    const sensorGhostRefs = QUIRK_COMBAT_SUPPORT.sensor_ghosts.sourceRefs ?? [];
    const weaponQuirkRefs = QUIRK_COMBAT_SUPPORT.accurate.sourceRefs ?? [];

    expect(QUIRK_COMBAT_SUPPORT.sensor_ghosts).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('+1 attacker to-hit penalty'),
    });
    expect(sensorGhostRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processAttackerQuirks applies +1 Sensor Ghosts to the attacker to-hit number.',
      'MegaMek OptionsConstants defines QUIRK_NEG_SENSOR_GHOSTS as sensor_ghosts.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'ranged-to-hit-calculation'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(
      expect.arrayContaining(sensorGhostRefs.map(({ citation }) => citation)),
    );

    expect(weaponQuirkRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processAttackerQuirks applies Accurate -1, Inaccurate +1, and Stable Weapon -1 when the attacker ran.',
      'MegaMek OptionsConstants defines Accurate, Stable Weapon, and Inaccurate weapon quirk ids.',
    ]);
    expect(QUIRK_COMBAT_SUPPORT.inaccurate.sourceRefs).toEqual(weaponQuirkRefs);
    expect(QUIRK_COMBAT_SUPPORT.stable_weapon.sourceRefs).toEqual(
      weaponQuirkRefs,
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['weapon-to-hit-quirk-application']
        .sourceRefs,
    ).toEqual(weaponQuirkRefs);
  });

  it('pins range targeting quirk rows to MegaMek behavior while preserving MekStation aliases', () => {
    const targetingRefs =
      QUIRK_COMBAT_SUPPORT.improved_targeting_short.sourceRefs ?? [];
    const targetingCitations = targetingRefs.map(({ citation }) => citation);

    expect(QUIRK_COMBAT_SUPPORT.improved_targeting_short).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('short-range Improved Targeting'),
    });
    expect(targetingCitations).toEqual([
      'MegaMek Entity range modifier helpers apply Improved Targeting -1 and Poor Targeting +1 at short, medium, and long range.',
      'MegaMek OptionsConstants defines source-backed targeting quirk ids as imp_target_short/med/long and poor_target_short/med/long.',
      'MekStation QUIRK_CATALOG keeps local improved_targeting_* and poor_targeting_* aliases for the same range-targeting quirk family.',
      'MekStation calculateTargetingQuirkModifier applies local aliases as +/-1 at the matching range bracket.',
    ]);
    expect(targetingRefs.map(({ kind }) => kind)).toEqual([
      'megamek-source',
      'megamek-source',
      'mekstation-deviation',
      'mekstation-deviation',
    ]);
    expect(QUIRK_COMBAT_SUPPORT.improved_targeting_medium.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.improved_targeting_long.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.poor_targeting_short.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.poor_targeting_medium.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(QUIRK_COMBAT_SUPPORT.poor_targeting_long.sourceRefs).toEqual(
      targetingRefs,
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'ranged-to-hit-calculation'
      ].sourceRefs?.map(({ citation }) => citation),
    ).toEqual(expect.arrayContaining(targetingCitations.slice(0, 2)));
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

  it('pins legacy Evasive to the source-backed TacOps Evade action gap', () => {
    const evasiveRefs = SPA_COMBAT_SUPPORT.evasive.sourceRefs ?? [];
    const movementRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application']
        .sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.evasive).toMatchObject({
      level: 'unsupported',
      gap: expect.stringContaining('optional TacOps Evade movement'),
    });
    expect(SPA_COMBAT_SUPPORT.evasive.gap).toContain(
      'attacker firing, and target modifier semantics',
    );
    expect(evasiveRefs.map(({ citation }) => citation)).toEqual(
      expect.arrayContaining([
        'MegaMek OptionsConstants defines optional TacOps Evade and Skilled Evasion option ids.',
        'MegaMek GameOptions registers optional TacOps Evade and Skilled Evasion movement rules.',
        'MegaMek MoveStepType defines EVADE as a movement step.',
        'MegaMek Entity.getEvasionBonus returns the target evasion modifier, including optional Skilled Evasion piloting-skill scaling.',
        'MegaMek ComputeTargetToHitMods applies the target evasion bonus to ranged weapon attacks.',
        'MegaMek ComputeToHitIsImpossible prevents non-large-spacecraft evading attackers from firing ranged attacks.',
      ]),
    );
    expect(movementRefs).toEqual(expect.arrayContaining([...evasiveRefs]));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
    ).toEqual(expect.arrayContaining(['evasive']));
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

  it('pins source-backed initiative bonuses and Tactical Genius reroll flow', () => {
    const commandRefs = QUIRK_COMBAT_SUPPORT.command_mech.sourceRefs ?? [];
    const battleComputerRefs =
      QUIRK_COMBAT_SUPPORT.battle_computer.sourceRefs ?? [];
    const tacticalGeniusRefs =
      SPA_COMBAT_SUPPORT['tactical-genius'].sourceRefs ?? [];
    const applicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application']
        .sourceRefs ?? [];
    const equipmentRefs = applicationRefs.slice(
      commandRefs.length,
      applicationRefs.length - tacticalGeniusRefs.length,
    );

    expect(QUIRK_COMBAT_SUPPORT.command_mech).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('rollInitiative'),
      gap: expect.stringContaining('equipment hydration'),
    });
    expect(QUIRK_COMBAT_SUPPORT.battle_computer).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('non-cumulative'),
      gap: expect.stringContaining('equipment hydration'),
    });
    expect(SPA_COMBAT_SUPPORT['tactical-genius']).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('replaces only that side raw 2d6 roll'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'],
    ).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('raw 2d6 payload fields'),
      gap: expect.stringContaining('Combat Intuition'),
    });
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'].gap,
    ).toContain('equipment hydration');
    expect(commandRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Entity.getQuirkIniBonus returns +2 for Battle Computer or +1 for Command Mech, and does not stack them.',
      'MegaMek OptionsConstants defines QUIRK_POS_BATTLE_COMP as battle_computer and QUIRK_POS_COMMAND_MEK as command_mech.',
    ]);
    expect(battleComputerRefs).toEqual(commandRefs);
    expect(equipmentRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
      'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
      'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
      'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
      'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
    ]);
    expect(tacticalGeniusRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Game.hasTacticalGenius checks for a conscious active unit with MISC_TACTICAL_GENIUS before initiative reroll handling.',
      'MegaMek InitiativeRoll.replaceRoll replaces the previous initiative roll and records that Tactical Genius was used.',
      'MegaMek OptionsConstants defines MISC_TACTICAL_GENIUS as tactical_genius.',
    ]);
    expect(applicationRefs).toEqual([
      ...commandRefs,
      ...equipmentRefs,
      ...tacticalGeniusRefs,
    ]);
  });

  it('pins initiative equipment hydration as unsupported until eligibility context exists', () => {
    const hqHydration =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'initiative-hq-equipment-hydration'
      ];
    const commandConsoleHydration =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'initiative-command-console-hydration'
      ];
    const equipmentCitations = [
      'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
      'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
      'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
      'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
      'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
    ];

    expect(hqHydration).toMatchObject({
      level: 'unsupported',
      evidence: 'No combat resolver consumes this modifier family',
      gap: expect.stringContaining('working communications equipment'),
    });
    expect(hqHydration.gap).toContain('Default communications mode');
    expect(hqHydration.gap).toContain('initiativeHQBonus');
    expect(commandConsoleHydration).toMatchObject({
      level: 'unsupported',
      evidence: 'No combat resolver consumes this modifier family',
      gap: expect.stringContaining('active command-console crew'),
    });
    expect(commandConsoleHydration.gap).toContain('heavy-or-larger');
    expect(commandConsoleHydration.gap).toContain('advanced-fire-control');
    expect(commandConsoleHydration.gap).toContain('initiativeCommandBonus');
    expect(hqHydration.sourceRefs?.map(({ citation }) => citation)).toEqual(
      equipmentCitations,
    );
    expect(
      commandConsoleHydration.sourceRefs?.map(({ citation }) => citation),
    ).toEqual(equipmentCitations);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['initiative-hq-equipment-hydration'],
    ).toEqual({ spaIds: [], quirkIds: [] });
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
        'initiative-command-console-hydration'
      ],
    ).toEqual({ spaIds: [], quirkIds: [] });
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

  it('pins Shaky Stick to MegaMek ground-to-air defender semantics', () => {
    const refs = SPA_COMBAT_SUPPORT.shaky_stick.sourceRefs ?? [];

    expect(SPA_COMBAT_SUPPORT.shaky_stick).toMatchObject({
      level: 'integrated',
      evidence: expect.stringContaining('ground-to-air'),
    });
    expect(refs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
      'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
    ]);
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
    ).toEqual(expect.arrayContaining(['shaky_stick']));
    expect(
      PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration']
        .spaIds,
    ).toEqual(expect.arrayContaining(['shaky_stick']));
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

  it('pins heat-driven SPA support to source-backed and local-only boundaries', () => {
    const hotDogRefs = SPA_COMBAT_SUPPORT['hot-dog'].sourceRefs ?? [];
    const someLikeItHotRefs =
      SPA_COMBAT_SUPPORT['some-like-it-hot'].sourceRefs ?? [];
    const heatApplicationRefs =
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'].sourceRefs ??
      [];

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
      level: 'helper-only',
      evidence: expect.stringContaining('getCoolUnderFireHeatReduction'),
      gap: expect.stringContaining('No MegaMek source-backed'),
    });
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

    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
    ).toMatchObject({
      level: 'helper-only',
      evidence: expect.stringContaining('source-backed Some Like It Hot'),
      gap: expect.stringContaining('Cool Under Fire'),
    });
    expect(heatApplicationRefs).toEqual([...hotDogRefs, ...someLikeItHotRefs]);
  });

  it('pins local-only SPA gaps to MegaMek registry and MekStation deviation refs', () => {
    const localOnlySpaIds = [
      'acrobat',
      'natural-grace',
      'speed-demon',
      'combat-intuition',
      'cool-under-fire',
      'antagonizer',
    ] as const;

    localOnlySpaIds.forEach((spaId) => {
      const support = SPA_COMBAT_SUPPORT[spaId];
      expect(support.sourceRefs?.map(({ citation }) => citation)).toEqual([
        'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
        'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
        'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, and Antagonizer; these must remain unsupported or helper-only until a source-backed combat authority is identified.',
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

    expect(SPA_COMBAT_SUPPORT['cool-under-fire'].level).toBe('helper-only');
    expect(SPA_COMBAT_SUPPORT['cool-under-fire'].gap).toContain(
      'local helper behavior',
    );
    expect(SPA_COMBAT_SUPPORT['combat-intuition'].gap).toContain(
      'no source-backed MegaMek combat SPA id',
    );
    expect(
      PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['target-priority-application'],
    ).toMatchObject({
      level: 'unsupported',
      sourceRefs: SPA_COMBAT_SUPPORT.antagonizer.sourceRefs,
    });
  });

  it('keeps source-backed pilot modifier refs commit-pinned', () => {
    const refs = [
      ...(SPA_COMBAT_SUPPORT['multi-tasker'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['multi-target'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['dodge-maneuver'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.shaky_stick.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['hopping-jack'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['jumping-jack'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_frogman.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_forest_ranger.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_mountaineer.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT.tm_swamp_beast.sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['cross-country'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['hot-dog'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['some-like-it-hot'].sourceRefs ?? []),
      ...(SPA_COMBAT_SUPPORT['tactical-genius'].sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.command_mech.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.battle_computer.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.sensor_ghosts.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.accurate.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.inaccurate.sourceRefs ?? []),
      ...(QUIRK_COMBAT_SUPPORT.stable_weapon.sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'multi-target-penalty-application'
      ].sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
        'weapon-to-hit-quirk-application'
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
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application']
        .sourceRefs ?? []),
      ...(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application']
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
