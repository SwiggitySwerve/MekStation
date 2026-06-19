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

it('pins Heavy Lifter to MegaMek lift-capacity scope', () => {
  const heavyLifterRefs = SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? [];
  const movementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].sourceRefs ??
    [];
  const liftCapacityRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-lift-capacity-application'
    ].sourceRefs ?? [];
  const carryObjectCapacityRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-capacity-check-application'
    ].sourceRefs ?? [];
  const groundObjectWeightGateRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-ground-object-weight-gate-application'
    ].sourceRefs ?? [];
  const carryObjectRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-action-application'
    ].sourceRefs ?? [];
  const throwObjectRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-object-action-application'
    ].sourceRefs ?? [];
  const throwReleaseRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-release-lifecycle-application'
    ].sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT['heavy-lifter']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      '5 percent per available hand lift capacity',
    ),
  });
  expect(SPA_COMBAT_SUPPORT['heavy-lifter'].evidence).toContain(
    'canonical hvy_lifter and legacy heavy-lifter 1.5 multipliers',
  );
  expect(SPA_COMBAT_SUPPORT['heavy-lifter'].evidence).toContain(
    'active TSM pickup multiplier',
  );
  expect(SPA_COMBAT_SUPPORT['heavy-lifter'].gap).toBeUndefined();
  expect(heavyLifterRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek MekWithArms.maxGroundObjectTonnage multiplies BattleMech ground-object lift capacity by 1.5 for Heavy Lifter.',
    'MegaMek ProtoMek.maxGroundObjectTonnage multiplies ProtoMek ground-object lift capacity by 1.5 for Heavy Lifter.',
    'MegaMek OptionsConstants defines PILOT_HVY_LIFTER as hvy_lifter.',
    'MekStation calculateGroundObjectLiftCapacity implements the source-backed 5 percent per available hand lift capacity plus Heavy Lifter and TSM pickup multipliers.',
    'MekStation SPA helper tests prove canonical and legacy Heavy Lifter ids apply the 1.5 lift-capacity multiplier as capacity math independent from throw action resolution.',
  ]);
  expect(movementRefs).toEqual(expect.arrayContaining([...heavyLifterRefs]));
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-lift-capacity-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('1.5 BattleMech lift-capacity'),
  });
  expect(liftCapacityRefs).toEqual(heavyLifterRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-capacity-check-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('carry-object capacity-check slice'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-capacity-check-application'
    ].evidence,
  ).toContain(
    'no thrown-object attack damage or target interaction is claimed',
  );
  expect(carryObjectCapacityRefs).toEqual(heavyLifterRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-ground-object-weight-gate-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('ground-object weight gate'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-ground-object-weight-gate-application'
    ].evidence,
  ).toContain('throw range, thrown-object damage');
  expect(groundObjectWeightGateRefs.map(({ citation }) => citation)).toEqual([
    ...heavyLifterRefs.map(({ citation }) => citation),
    'MekStation checkGroundObjectLiftCapacity gates represented ground-object payload tonnage against source-backed lift capacity before pickup/drop lifecycle support consumes that state.',
    'MekStation SPA helper tests prove the represented ground-object weight gate allows payloads at or below Heavy Lifter capacity and rejects overweight or invalid payloads.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'heavy-lifter-lift-capacity-application'
    ].spaIds,
  ).toEqual(['heavy-lifter']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'heavy-lifter-carry-object-capacity-check-application'
    ].spaIds,
  ).toEqual(['heavy-lifter']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'heavy-lifter-ground-object-weight-gate-application'
    ].spaIds,
  ).toEqual(['heavy-lifter']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
  ).toEqual(expect.arrayContaining(['heavy-lifter']));
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-action-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('represented pickup/carry/drop'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-action-application'
    ].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-release-lifecycle-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('event-sourced throw-release lifecycle'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-release-lifecycle-application'
    ].evidence,
  ).toContain('no throw range, to-hit, damage, displacement');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-release-lifecycle-application'
    ].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-object-action-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('bounded throw-object action resolution'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-object-action-application'
    ].evidence,
  ).toContain('without claiming throw range, to-hit, damage');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-throw-object-action-application'
    ].gap,
  ).toBeUndefined();
  expect(carryObjectRefs.map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      'MegaMek MoveStepType registers pickup and drop cargo movement steps for carryable-object lifecycle actions.',
      'MegaMek MovePathHandler resolves PICKUP_CARGO by finding ground objects, checking maxGroundObjectTonnage against payload tonnage, and calling processPickupStep.',
      'MegaMek MovePathHandler resolves DROP_CARGO by dropping the carried object and placing the ground object at the step position.',
      'MekStation groundObjectActions validates represented pickup/drop actions, consumes Heavy Lifter lift-capacity gates, and emits event-sourced carried-object lifecycle events.',
      'MekStation gameplay coverage proves represented pickup/drop events update object state and reject overweight payloads without side effects.',
      'MekStation runner coverage proves represented pickup/drop helper parity emits events and preserves invalid-action no-side-effect behavior.',
    ]),
  );
  expect(throwReleaseRefs.map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      'MekStation GroundObjectDropped payloads distinguish represented throw releases from ordinary drops with reason=throw while reusing the carried-object release lifecycle.',
      'MekStation declareGroundObjectThrow emits an event-sourced throw release to a declared hex without claiming throw attack range, hit resolution, damage, or displacement.',
      'MekStation runner ground-object helpers emit reason=throw release events and clear represented carried-object state without resolving throw damage.',
      'MekStation gameplay and runner coverage prove represented throw-release events land the carried object at the declared hex and clear carried-object state.',
    ]),
  );
  expect(throwObjectRefs).toEqual(
    expect.arrayContaining([...heavyLifterRefs, ...throwReleaseRefs]),
  );
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'heavy-lifter-carry-object-action-application'
    ].spaIds,
  ).toEqual(['heavy-lifter']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'heavy-lifter-throw-object-action-application'
    ].spaIds,
  ).toEqual(['heavy-lifter']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'heavy-lifter-throw-release-lifecycle-application'
    ].spaIds,
  ).toEqual(['heavy-lifter']);
});

it('pins Sandblaster to MegaMek cluster-table range bonuses and catalog-authored rapid-fire AC support', () => {
  const sandblasterRefs = SPA_COMBAT_SUPPORT.sandblaster.sourceRefs ?? [];
  const applicationRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application']
      .sourceRefs ?? [];
  const rateOfFireApplicationRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-rate-of-fire-application'
    ].sourceRefs ?? [];
  const tacOpsRapidFireApplicationRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-tacops-rapid-fire-application'
    ].sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT.sandblaster).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('+4/+3/+2'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['sandblaster-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('designated weapon type'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-rate-of-fire-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'explicitly authored ordinary AC rate-of-fire modes',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-tacops-rapid-fire-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'UnitHydration authors official ordinary ac-2/ac-5/ac-10/ac-20 catalog rows',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-tacops-rapid-fire-application'
    ].gap,
  ).toBeUndefined();
  expect(sandblasterRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek WeaponHandler.getClusterModifiers applies Sandblaster as +4 short, +3 medium, or +2 long cluster-table modifiers for the designated weapon, taking precedence over Cluster Hitter.',
    'MegaMek PilotSPAHelper limits Sandblaster designations to UAC, LB-X AC, TacOps rapid-fire AC, and damage-by-cluster-table weapons.',
    'MegaMek OptionsConstants defines GUNNERY_SANDBLASTER as sandblaster.',
  ]);
  expect(applicationRefs).toEqual(sandblasterRefs);
  expect(rateOfFireApplicationRefs).toEqual(sandblasterRefs);
  expect(tacOpsRapidFireApplicationRefs).toEqual(sandblasterRefs);
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
    level: 'integrated',
    evidence: expect.stringContaining('rollInitiative'),
  });
  expect(QUIRK_COMBAT_SUPPORT.command_mech.evidence).toContain(
    'initiative-equipment-producer-hydration',
  );
  expect(QUIRK_COMBAT_SUPPORT.battle_computer).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('non-cumulative'),
  });
  expect(QUIRK_COMBAT_SUPPORT.battle_computer.evidence).toContain(
    'initiative-equipment-producer-hydration',
  );
  expect(SPA_COMBAT_SUPPORT['tactical-genius']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('replaces only that side raw 2d6 roll'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('raw 2d6 payload fields'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'].evidence,
  ).toContain('initiativeEquipment gates');
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
