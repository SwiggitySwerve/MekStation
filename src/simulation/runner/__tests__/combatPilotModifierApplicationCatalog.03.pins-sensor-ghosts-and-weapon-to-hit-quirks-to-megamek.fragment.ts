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
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['physical-to-hit-application'].quirkIds,
  ).toEqual(expect.arrayContaining(['battle_fists_la', 'battle_fists_ra']));
});

it('pins represented Zweihander physical slices and canonical support', () => {
  const resolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'zweihander-punch-physical-application'
    ];
  const citations = resolver.sourceRefs?.map(({ citation }) => citation);

  expect(resolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'two-handed punch and every official standalone physical-weapon prompt',
    ),
  });
  expect(resolver.evidence).toContain(
    'represented self-critical side-effect slices',
  );
  expect(resolver.evidence).toContain(
    'selected-arm physical-weapon limb/location declarations',
  );
  expect(resolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['zweihander-punch-physical-application']
      .spaIds,
  ).toEqual(['zweihander']);
  expect(citations).toEqual(
    expect.arrayContaining([
      'MegaMek BipedMek.canZweihander requires the SPA, both hand actuators, both arms intact, no arm weapons fired, and not prone.',
      'MekStation canPunch and canMeleeWeapon reject explicit two-handed Zweihander declarations unless the represented SPA, non-prone, both-arm-present, represented per-arm hand-actuator, selected-arm physical-weapon, and represented arm-fire prerequisites pass.',
      'MekStation calculatePunchToHit and calculateMeleeWeaponToHit consume represented per-location off-arm upper and lower actuator damage as two-handed Zweihander to-hit penalties.',
      'MekStation physical combat tests prove represented Zweihander punch and supported physical-weapon bonus damage, selected-arm physical-weapon declaration legality, off-arm actuator to-hit penalties, per-arm hand-actuator gates, miss PSR behavior, represented self-critical side-effect behavior, and invalid declaration no-side-effect gating without claiming non-catalog improvised club or breakage fidelity.',
    ]),
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'every official standalone physical-weapon declaration',
    ),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.zweihander.gap).toBeUndefined();
});

it('splits represented DFA-miss bioware pilot-damage avoidance from broad implant hydration', () => {
  const resolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'dfa-miss-bioware-pilot-damage-avoidance'
    ];
  const citations = resolver.sourceRefs?.map(({ citation }) => citation);

  expect(resolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented missed-DFA fall pilot-damage immunity slice',
    ),
  });
  expect(resolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.dermal_armor',
  );
  expect(resolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.tsm_implant',
  );
  expect(resolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'dfa-miss-bioware-pilot-damage-avoidance'
    ].spaIds,
  ).toEqual(['dermal_armor', 'tsm_implant']);
  expect(citations).toEqual(
    expect.arrayContaining([
      'MekStation resolveDfaMissFallPilotDamageAvoidance consumes dermal_armor and tsm_implant pilot ability ids as missed-DFA fall pilot-damage immunity only.',
      'MekStation physical attack helper coverage proves dermal_armor and tsm_implant suppress missed-DFA fall pilot damage without rolling a pilot-damage avoidance check.',
      'MekStation event-sourced physical combat coverage proves a passed missed-DFA fall pilot-damage avoidance emits UnitFell without PilotHit or pilot wounds.',
      'MegaMek TWGameManager.checkPilotAvoidFallDamage skips fall pilot-damage avoidance rolls when the entity has Dermal Armor or TSM Implant.',
    ]),
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('non-BattleMech infantry'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tsm_implant).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'ordinary BattleMech physical-weapon TSM damage remains modeled by equipment heat state',
    ),
  });
});

it('splits represented Dermal Armor head-hit suppression from broad implant hydration', () => {
  const resolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'dermal-armor-head-hit-pilot-damage-suppression'
    ];
  const citations = resolver.sourceRefs?.map(({ citation }) => citation);

  expect(resolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented head-hit pilot-damage suppression slice',
    ),
  });
  expect(resolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.dermal_armor',
  );
  expect(resolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'dermal-armor-head-hit-pilot-damage-suppression'
    ].spaIds,
  ).toEqual(['dermal_armor']);
  expect(citations).toEqual(
    expect.arrayContaining([
      'MegaMek TWDamageManager suppresses BattleMech head-hit crew damage when the unit has MD_DERMAL_ARMOR.',
      'MegaMek TWDamageManagerModular suppresses BattleMech head-hit crew damage when the Mek has MD_DERMAL_ARMOR.',
      'MekStation resolveDamage consumes dermal_armor pilot ability state to suppress head-hit pilot damage while preserving head armor and structure damage.',
      'MekStation head-damage-cap coverage proves Dermal Armor head hits damage the head but emit no pilot damage and leave pilot wounds unchanged.',
    ]),
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_armor).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'head-hit pilot-damage suppression slice',
    ),
  });
});

it('represents Eagle Eyes active-probe range and minefield detonation relief', () => {
  const activeProbeResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'eagle-eyes-active-probe-range-application'
    ];
  const minefieldResolver =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'eagle-eyes-minefield-detonation-application'
    ];
  const activeProbeCitations = activeProbeResolver.sourceRefs?.map(
    ({ citation }) => citation,
  );
  const minefieldCitations = minefieldResolver.sourceRefs?.map(
    ({ citation }) => citation,
  );

  expect(activeProbeResolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('active-probe ECM-counter range slice'),
  });
  expect(activeProbeResolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.eagle_eyes',
  );
  expect(activeProbeResolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'eagle-eyes-active-probe-range-application'
    ].spaIds,
  ).toEqual(['eagle_eyes']);
  expect(activeProbeCitations).toEqual(
    expect.arrayContaining([
      'MegaMek Entity.getBAPRange adds a +1 active-probe range bonus when the pilot has MISC_EAGLE_EYES.',
      'MekStation represented active-probe ECM counter range accepts eagleEyesRangeBonus and adds one hex without changing base probe ranges.',
      'MekStation createInitialState seeds eagleEyesRangeBonus from hydrated fullUnit ability ids for represented active-probe state.',
      'MekStation electronic warfare coverage proves Eagle Eyes extends represented active-probe Guardian ECM countering by one hex.',
      'MekStation GameCreated coverage proves hydrated eagle_eyes ability state is projected onto active probes as eagleEyesRangeBonus.',
    ]),
  );
  expect(minefieldResolver).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('detonation roll'),
  });
  expect(minefieldResolver.evidence).toContain(
    'featureSupport.canonicalPilotAbilityScope.eagle_eyes',
  );
  expect(minefieldResolver.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'eagle-eyes-minefield-detonation-application'
    ].spaIds,
  ).toEqual(['eagle_eyes']);
  expect(minefieldCitations).toEqual(
    expect.arrayContaining([
      'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
      'MekStation represented TerrainType.Mines entry damage resolves a deterministic minefield detonation target roll and applies Eagle Eyes +2 target-number relief before BattleMech leg damage.',
      'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
    ]),
  );
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'active-probe ECM-counter range gains one hex',
    ),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.gap).toBeUndefined();
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes.evidence).toContain(
    'detonation target-number relief',
  );
});
