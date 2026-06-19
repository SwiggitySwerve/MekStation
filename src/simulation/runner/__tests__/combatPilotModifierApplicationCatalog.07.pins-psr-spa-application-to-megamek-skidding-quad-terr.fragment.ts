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

it('pins PSR SPA application to MegaMek skidding, quad, Terrain Master PSR, and visible gap semantics', () => {
  const psrSpaRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'].sourceRefs ??
    [];
  const maneuveringAceRefs =
    SPA_COMBAT_SUPPORT['maneuvering-ace'].sourceRefs ?? [];
  const movementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].sourceRefs ??
    [];
  const controlledSideslipRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-controlled-sideslip-producer-application'
    ].sourceRefs ?? [];
  const flankingTurningRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-flanking-turning-producer-application'
    ].sourceRefs ?? [];
  const outOfControlProducerRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-out-of-control-producer-application'
    ].sourceRefs ?? [];
  const aerospaceMovementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'aerospace-maneuvering-ace-movement-application'
    ].sourceRefs ?? [];
  const psrSpaTargetNumberRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-target-number-application']
      .sourceRefs ?? [];
  const lateralMovementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-lateral-movement-application'
    ].sourceRefs ?? [];

  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Frogman water-entry relief'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-target-number-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Swamp Beast bog-down relief'),
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
  expect(psrSpaTargetNumberRefs).toEqual(psrSpaRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
  ).toEqual(
    expect.arrayContaining(['tm_frogman', 'tm_mountaineer', 'tm_swamp_beast']),
  );
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-target-number-application']
      .spaIds,
  ).toEqual([
    'maneuvering-ace',
    'tm_frogman',
    'tm_mountaineer',
    'tm_swamp_beast',
    'animal-mimicry',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
  ).not.toContain('terrain-master');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['psr-spa-application'].spaIds,
  ).not.toContain('cross-country');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'].evidence,
  ).toContain('Animal Mimicry quad-Mek relief');
  expect(SPA_COMBAT_SUPPORT['maneuvering-ace']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('BattleMech skidding PSRs'),
  });
  expect(SPA_COMBAT_SUPPORT['maneuvering-ace'].evidence).toContain(
    'QuadMek lateral-step MP relief',
  );
  expect(SPA_COMBAT_SUPPORT['maneuvering-ace'].evidence).toContain(
    'out-of-control pending PSRs',
  );
  expect(SPA_COMBAT_SUPPORT['maneuvering-ace'].gap).toBeUndefined();
  expect(maneuveringAceRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Entity.getMovementBeforeSkidPSRModifier reduces the skidding PSR movement-distance modifier by 1 for PILOT_MANEUVERING_ACE.',
    'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    'MegaMek OptionsConstants defines the source-backed Maneuvering Ace SPA id as maneuvering_ace.',
    'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
    'MekStation createOutOfControlPSR plus runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
  ).toEqual(expect.arrayContaining(['maneuvering-ace']));
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('QuadMek lateral-step MP relief'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-controlled-sideslip-producer-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'queues represented controlled-sideslip PSRs',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-controlled-sideslip-producer-application'
    ].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-flanking-turning-producer-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'queues one represented flanking-and-turning PSR',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-flanking-turning-producer-application'
    ].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-out-of-control-producer-application'
    ],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'aerospace, capital craft, and airborne LAM/AirMek',
    ),
    gap: expect.stringContaining('separate aerospace/LAM validation'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-lateral-movement-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('BattleMech biped lateral shifts'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'aerospace-maneuvering-ace-movement-application'
    ],
  ).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('aerospace maneuver-thrust relief'),
    gap: expect.stringContaining('separate aerospace movement matrix'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'aerospace-maneuvering-ace-movement-application'
    ].spaIds,
  ).toEqual(['maneuvering-ace']);
  expect(aerospaceMovementRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek ManeuverStep reduces aerospace maneuver thrust cost by 1 for Maneuvering Ace.',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
  ]);
  expect(movementRefs.map(({ citation }) => citation)).toEqual(
    expect.arrayContaining([
      'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
      'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
      'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
      'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
      'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
      'MekStation createOutOfControlPSR plus calculatePSRModifiers and runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
    ]),
  );
  expect(movementRefs).toEqual(
    expect.not.arrayContaining([...aerospaceMovementRefs]),
  );
  expect(controlledSideslipRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    'MekStation movementControlPsr queues represented controlled-sideslip PSRs for lateral movement steps and suppresses walking Maneuvering Ace lateral shifts.',
    'MekStation runner movement coverage proves walking Maneuvering Ace lateral shifts suppress controlled-sideslip PSRs while running lateral shifts emit controlled_sideslip with a movement-step trigger source.',
  ]);
  expect(flankingTurningRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Entity.checkSideSlip applies Maneuvering Ace relief to flanking-and-turning checks and suppresses controlled-sideslip checks for walking Maneuvering Ace units.',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    'MekStation movementControlPsr queues one represented flanking-and-turning PSR for BattleMech run/sprint movement when movement-step decomposition changes facing after moving more than one hex, while excluding Infantry and ProtoMech units.',
    'MekStation runner movement coverage proves represented BattleMech flanking-and-turning production plus walking, straight-running, Infantry, and ProtoMech non-production cases.',
  ]);
  expect(outOfControlProducerRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek TWGameManager.resolveControl resolves control rolls only for a single aero or airborne LAM in AirMek mode, returning before control-roll production for ordinary BattleMechs.',
    'MegaMek TWGameManager.getPilotingRollData applies -1 Maneuvering Ace to out-of-control control rolls without applying it to recovery rolls.',
    'MegaMek MovePathHandler queues aero control rolls for thrust, velocity, descent, hover, and stall movement side paths.',
    'MegaMek HeatResolver queues heat-driven control rolls for DropShip, JumpShip, and capital fighter heat side paths.',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    'MekStation createOutOfControlPSR plus calculatePSRModifiers and runPSRPhase consume Maneuvering Ace pilot ability state for represented out-of-control pending PSR target-number relief.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'maneuvering-ace-controlled-sideslip-producer-application'
    ].spaIds,
  ).toEqual(['maneuvering-ace']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'maneuvering-ace-flanking-turning-producer-application'
    ].spaIds,
  ).toEqual(['maneuvering-ace']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'maneuvering-ace-out-of-control-producer-application'
    ].spaIds,
  ).toEqual(['maneuvering-ace']);
  expect(lateralMovementRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek MovePath.canShift lets Maneuvering Ace biped Meks perform lateral shifts.',
    'MegaMek SideStepStep preserves base lateral-step MP for QuadMek units with Maneuvering Ace instead of adding the normal side-step surcharge.',
    'MegaMek OptionsConstants defines PILOT_MANEUVERING_ACE as maneuvering_ace.',
    'MekStation validateMovement, runMovementPhase, and movement step decomposition consume Maneuvering Ace pilot ability state for biped lateral shifts and source-backed QuadMek lateral-step MP relief.',
  ]);
  expect(
    lateralMovementRefs.map(({ citation }) => citation).join(' '),
  ).not.toContain('aerospace maneuver thrust');
  expect(
    lateralMovementRefs.map(({ citation }) => citation).join(' '),
  ).not.toContain('out-of-control');
  expect(lateralMovementRefs).toEqual(
    expect.not.arrayContaining([
      ...(SPA_COMBAT_SUPPORT['heavy-lifter'].sourceRefs ?? []),
    ]),
  );
});

it('pins Cross-Country to MegaMek combat-vehicle movement scope', () => {
  const crossCountryRefs = SPA_COMBAT_SUPPORT['cross-country'].sourceRefs ?? [];
  const movementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].sourceRefs ??
    [];
  const vehicleMovementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['vehicle-movement-application']
      .sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT['cross-country']).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('combat-vehicle'),
  });
  expect(SPA_COMBAT_SUPPORT['cross-country'].gap).toContain(
    'not a BattleMech terrain PSR',
  );
  expect(crossCountryRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek Terrain.movementCost applies Cross-Country only inside ground combat-vehicle terrain movement-cost gates.',
    'MegaMek Tank.isLocationProhibited applies Cross-Country to tracked, wheeled, and hover combat-vehicle passability gates.',
    'MegaMek OptionsConstants defines PILOT_CROSS_COUNTRY as cross_country.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'],
  ).toMatchObject({
    level: 'integrated',
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].gap,
  ).toBeUndefined();
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['vehicle-movement-application'],
  ).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('Vehicle movement/passability'),
  });
  expect(movementRefs).toEqual(
    expect.not.arrayContaining([...crossCountryRefs]),
  );
  expect(vehicleMovementRefs).toEqual(crossCountryRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
  ).not.toContain('cross-country');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['vehicle-movement-application'].spaIds,
  ).toEqual(['cross-country']);
});

it('splits legacy Evasive from source-backed TacOps Evade action coverage', () => {
  const evasiveRefs = SPA_COMBAT_SUPPORT.evasive.sourceRefs ?? [];
  const movementRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'].sourceRefs ??
    [];

  expect(SPA_COMBAT_SUPPORT.evasive).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('local SPA catalog'),
    gap: expect.stringContaining('source-backed evasion remains covered'),
  });
  expect(SPA_COMBAT_SUPPORT.evasive.gap).toContain(
    'integrated optional TacOps Evade movement action row',
  );
  expect(evasiveRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
    'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
    'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
  ]);
  expect(movementRefs).toEqual(expect.not.arrayContaining([...evasiveRefs]));
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['movement-application'].spaIds,
  ).toEqual(['maneuvering-ace', 'heavy-lifter']);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'maneuvering-ace-lateral-movement-application'
    ].spaIds,
  ).toEqual(['maneuvering-ace']);
});
