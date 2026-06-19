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

it('pins represented initiative equipment hydration and producer gaps separately', () => {
  const hqHydration =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-hq-equipment-hydration'];
  const commandConsoleHydration =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'initiative-command-console-hydration'
    ];
  const producerHydration =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'initiative-equipment-producer-hydration'
    ];
  const equipmentCitations = [
    'MegaMek Team.getTotalInitBonus adds the best dynamic turn bonus and best command bonus for team initiative.',
    'MegaMek Player.getTurnInitBonus takes the best HQ or quirk initiative bonus across the player force.',
    'MegaMek Player.getIndividualCommandBonus adds +2 for qualifying command-console or active tech-officer units.',
    'MegaMek Entity.getHQIniBonus grants +1 at 3+ tons and +2 at 7+ tons of working communications gear in default mode.',
    'MegaMek Mek.hasCommandConsoleBonus requires command-console cockpit, active command console crew, heavy-or-larger chassis, and non-IndustrialMek or advanced fire control.',
  ];

  expect(hqHydration).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('calculateSideInitiativeModifier'),
  });
  expect(hqHydration.evidence).toContain('Default communications mode');
  expect(commandConsoleHydration).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('calculateSideInitiativeModifier'),
  });
  expect(commandConsoleHydration.evidence).toContain('heavy-or-larger');
  expect(commandConsoleHydration.evidence).toContain('advanced-fire-control');
  expect(producerHydration).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('command-console producer ids'),
  });
  expect(producerHydration.evidence).toContain(
    'communications-equipment:size:N',
  );
  expect(producerHydration.evidence).toContain(
    'communications-equipment-N-ton:omni',
  );
  expect(producerHydration.evidence).toContain('COMMAND_CONSOLE');
  expect(producerHydration.evidence).toContain('istankcockpitcommandconsole');
  expect(producerHydration.evidence).toContain('tankcockpitcommandconsole');
  expect(producerHydration.evidence).toContain('ISRemoteDroneCommandConsole');
  expect(producerHydration.evidence).toContain('remotedronecommandconsole');
  expect(hqHydration.sourceRefs?.map(({ citation }) => citation)).toEqual(
    equipmentCitations,
  );
  expect(
    commandConsoleHydration.sourceRefs?.map(({ citation }) => citation),
  ).toEqual(equipmentCitations);
  expect(producerHydration.sourceRefs?.map(({ citation }) => citation)).toEqual(
    equipmentCitations,
  );
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['initiative-hq-equipment-hydration'],
  ).toEqual({ spaIds: [], quirkIds: [] });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['initiative-command-console-hydration'],
  ).toEqual({ spaIds: [], quirkIds: [] });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'initiative-equipment-producer-hydration'
    ],
  ).toEqual({ spaIds: [], quirkIds: [] });
});

it('pins Terrain Master Mountaineer PSR and movement relief to MegaMek semantics', () => {
  const mountaineerRefs = SPA_COMBAT_SUPPORT.tm_mountaineer.sourceRefs ?? [];
  const movementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].sourceRefs ??
    [];

  expect(SPA_COMBAT_SUPPORT.tm_mountaineer).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Mountaineer'),
  });
  expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain('tm_mountaineer');
  expect(mountaineerRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Entity.checkRubbleMove applies -1 Mountaineer to entering-rubble piloting rolls.',
    'MegaMek Terrain.movementCost applies -1 MP for Mountaineer in rough/rubble movement-cost branches.',
    'MegaMek MoveStep applies Mountaineer as one MP less for upward elevation changes.',
    'MegaMek OptionsConstants defines Terrain Master: Mountaineer as tm_mountaineer.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
  ).toBeUndefined();
  expect(movementRefs.map(({ citation }) => citation)).toEqual(
    expect.not.arrayContaining([
      'MegaMek Terrain.movementCost applies -1 MP for Mountaineer in rough/rubble movement-cost branches.',
      'MegaMek MoveStep applies Mountaineer as one MP less for upward elevation changes.',
      'MegaMek OptionsConstants defines PILOT_TM_MOUNTAINEER as tm_mountaineer.',
    ]),
  );
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
  ).toEqual(expect.arrayContaining(['tm_mountaineer']));
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
  ).not.toContain('tm_mountaineer');
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
  expect(SPA_COMBAT_SUPPORT['terrain-master'].gap).toContain('tm_swamp_beast');
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
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration'].spaIds,
  ).toEqual(expect.arrayContaining(['tm_forest_ranger', 'tm_swamp_beast']));
});

it('splits generic Terrain Master from source-backed Nightwalker lighting behavior', () => {
  const genericRefs = SPA_COMBAT_SUPPORT['terrain-master'].sourceRefs ?? [];
  const nightwalker = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.tm_nightwalker;
  const nightwalkerRefs = nightwalker.sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT['terrain-master']).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('generic terrain_master'),
    gap: expect.stringContaining('canonical tm_nightwalker'),
  });
  expect(genericRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek PilotOptions registers Terrain Master variants rather than a generic terrain_master combat option.',
    'MegaMek OptionsConstants defines Terrain Master variant ids for Forest Ranger, Frogman, Mountaineer, Nightwalker, and Swamp Beast.',
    'MekStation SPA_CATALOG keeps a legacy generic terrain-master row and splits implemented Terrain Master behavior into tm_frogman, tm_mountaineer, tm_forest_ranger, and tm_swamp_beast rows.',
  ]);
  expect(nightwalker).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('represented environmental light state'),
  });
  expect(nightwalker.evidence).toContain(
    'no Nightwalker to-hit modifier is claimed',
  );
  expect(nightwalker.evidence).toContain('prohibits run-derived');
  expect(nightwalker.evidence).toContain('airborne LAM');
  expect(nightwalker.gap).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'nightwalker-light-movement-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('MegaMek full moon'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'nightwalker-light-movement-application'
    ].evidence,
  ).not.toContain('featureSupport.canonicalPilotAbilityScope.tm_nightwalker');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'nightwalker-light-movement-application'
    ].evidence,
  ).toContain('no Nightwalker to-hit modifier is claimed');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'nightwalker-light-movement-application'
    ].evidence,
  ).toContain('airborne LAM ground projection remains blocked');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'nightwalker-light-movement-application'
    ].spaIds,
  ).toEqual(['tm_nightwalker']);
  expect(nightwalkerRefs.map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      'MegaMek PilotOptions registers Terrain Master: Nightwalker as the source-backed tm_nightwalker pilot option.',
      'MegaMek OptionsConstants defines Terrain Master: Nightwalker as tm_nightwalker.',
      'MegaMek LandAirMek.isNightwalker applies Terrain Master: Nightwalker only while the LAM is not airborne.',
      'MegaMek MoveStep uses isNightwalker to bypass full-moon, glare, moonless, solar-flare, and pitch-black movement light penalties, while prohibiting running in those light conditions.',
      'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
      'MekStation piloting SPA table defines the canonical piloting, defensive, physical-combat, Terrain Master, and ATOW G-Tolerance rows consumed by canonicalPilotAbilityScope.',
    ]),
  );
  expect(
    nightwalkerRefs.filter(({ kind }) => kind === 'megamek-source'),
  ).toHaveLength(8);
  expect(
    nightwalkerRefs.filter(({ kind }) => kind === 'mekstation-deviation')
      .length,
  ).toBeGreaterThanOrEqual(2);
  expect(
    Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
      ([resolverId, assignment]) =>
        (assignment.spaIds as readonly string[]).includes('tm_nightwalker') &&
        resolverId !== 'nightwalker-light-movement-application'
          ? [`${resolverId}.spa.tm_nightwalker`]
          : [],
    ),
  ).toEqual([]);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
  ).not.toContain('tm_nightwalker');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
  ).not.toContain('tm_nightwalker');
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
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration'].spaIds,
  ).toEqual(expect.arrayContaining(['shaky_stick']));
});

it('keeps local called-shot helpers out of MegaMek-backed SPA claims', () => {
  expect(SPA_COMBAT_SUPPORT.marksman).toMatchObject({
    level: 'out-of-scope',
  });
  expect(SPA_COMBAT_SUPPORT.sharpshooter).toMatchObject({
    level: 'out-of-scope',
  });
  expect(SPA_COMBAT_SUPPORT.marksman.gap).toContain('local called-shot helper');
  expect(SPA_COMBAT_SUPPORT.sharpshooter.gap).toContain(
    'Sharpshooter constant commented out',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['called-shot-application'],
  ).toEqual({
    spaIds: [],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'disable local Marksman/legacy Sharpshooter helper reductions',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'called-shot-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
  ]);
});
