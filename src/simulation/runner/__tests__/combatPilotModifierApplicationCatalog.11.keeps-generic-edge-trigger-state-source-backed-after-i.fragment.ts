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

it('keeps generic Edge trigger state source-backed after integration', () => {
  const edgeRefs = SPA_COMBAT_SUPPORT.edge.sourceRefs ?? [];
  const edgeCitations = edgeRefs.map(({ citation }) => citation);
  const megamekEdgeCitations = edgeCitations.slice(0, 8);

  expect(SPA_COMBAT_SUPPORT.edge).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Source-backed Edge trigger ids'),
  });
  expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
    'not the generic edge SPA alias by itself',
  );
  expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
    'UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state',
  );
  expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
    'hit-location resolution consumes edge_when_headhit and edge_when_tac',
  );
  expect(SPA_COMBAT_SUPPORT.edge.evidence).toContain(
    'represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS',
  );
  expect(edgeCitations).toEqual([
    'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
    'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
    'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
    'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
    'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
    'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'MekStation EDGE_TRIGGERS mirrors the known Edge trigger ids, partitions represented BattleMech triggers from out-of-scope aerospace triggers, deriveEdgePointCountFromPilotAbilities models the generic Edge point producer, and createEdgeState/canUseEdge/useEdge model trigger point consumption.',
    'MekStation UnitHydration copies source-backed fullUnit abilities into IUnitGameState and derives edgePointsRemaining from explicit Edge point state or the generic edge ability without treating trigger-only Edge ids as point producers.',
    'MekStation createHydratedUnitState seeds hydrated abilities and Edge point state into BattleMech combat state.',
    'MekStation GameCreated synthesis copies hydrated abilities and Edge point state into seed payloads so replay initialization preserves represented Edge state.',
    'MekStation hydration tests prove explicit Edge points, generic edge point production, trigger-only non-production, combat-state hydration, and GameCreated seed payload preservation.',
    'MekStation GameCreated tests prove hydrated pilot abilities and generic Edge points seed both initial runner state and replay GameCreated units.',
    'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
    'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
    'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
    'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
    'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
    'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
    'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
    'MekStation runner PSR tests prove edge_when_masc_fails rerolls failed MASC and Supercharger checks, spends Edge, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes.',
    'MekStation resolvePilotConsciousnessCheck consumes edge_when_ko to reroll failed BattleMech consciousness checks and returns superseded/final roll plus remaining Edge metadata.',
    'MekStation pilot consciousness tests prove edge_when_ko rerolls failed consciousness checks, spends represented Edge, and does not spend generic Edge or passing checks.',
    'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
    'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
    'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
    'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
  ]);
  expect(edgeRefs.map(({ kind }) => kind)).toEqual([
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].sourceRefs,
  ).toEqual(edgeRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].evidence,
  ).toContain('without treating the generic edge SPA alias as a trigger');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].evidence,
  ).toContain(
    'represented BattleMech and out-of-scope aerospace trigger ids are partitioned in EDGE_TRIGGERS',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].evidence,
  ).toContain(
    'UnitHydration and GameCreated synthesis seed hydrated fullUnit abilities plus generic Edge points into combat and replay state',
  );
  expect(PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'].level).toBe(
    'integrated',
  );
  const aerospaceEdgeIds = [
    'edge_when_aero_alt_loss',
    'edge_when_aero_explosion',
    'edge_when_aero_ko',
    'edge_when_aero_lucky_crit',
    'edge_when_aero_nuke_crit',
    'edge_when_aero_unit_cargo_lost',
  ];
  expect(
    aerospaceEdgeIds.map((spaId) => ({
      id: spaId,
      level: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].level,
      gap: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].gap,
    })),
  ).toEqual([
    {
      id: 'edge_when_aero_alt_loss',
      level: 'out-of-scope',
      gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
    },
    {
      id: 'edge_when_aero_explosion',
      level: 'out-of-scope',
      gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
    },
    {
      id: 'edge_when_aero_ko',
      level: 'out-of-scope',
      gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
    },
    {
      id: 'edge_when_aero_lucky_crit',
      level: 'out-of-scope',
      gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
    },
    {
      id: 'edge_when_aero_nuke_crit',
      level: 'out-of-scope',
      gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
    },
    {
      id: 'edge_when_aero_unit_cargo_lost',
      level: 'out-of-scope',
      gap: 'Aero Edge triggers belong in the separate aerospace validation matrix; Mek Edge triggers are handled row-by-row in the BattleMech matrix as runtime evidence proves each trigger-specific path',
    },
  ]);
  aerospaceEdgeIds.forEach((spaId) => {
    expect(canonicalSpaSourceCitations(spaId)).toEqual(
      expect.arrayContaining([
        'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
        'MekStation CANONICAL_SPA_LIST aggregates piloting, gunnery, miscellaneous, infantry, ATOW, bioware, unofficial, and Edge SPA tables into the row universe validated by canonicalPilotAbilityScope.',
        'MekStation Edge SPA table defines trigger-specific canonical Edge rows; canonicalPilotAbilityScope marks proven Mek Edge triggers integrated row-by-row, keeps aggregate Edge helper rows separate, and splits Aero Edge triggers out-of-scope.',
      ]),
    );
  });
  expect(
    Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS).flatMap(
      ([resolverId, assignment]) =>
        assignment.spaIds.flatMap((spaId) =>
          aerospaceEdgeIds.includes(spaId)
            ? [`${resolverId}.spa.${spaId}`]
            : [],
        ),
    ),
  ).toEqual([]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('edge_when_headhit'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application']
      .evidence,
  ).toContain('preserves the superseded head-hit metadata');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application']
      .sourceRefs,
  ).not.toEqual(edgeRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-head-hit-reroll-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    ...megamekEdgeCitations,
    'MekStation hit-location resolution selects edge_when_headhit for BattleMech head hits, spends represented Edge, and returns superseded/final location metadata.',
    'MekStation resolveWeaponHit passes target Edge state into hit-location resolution, persists remaining Edge points, and emits Edge reroll metadata on AttackResolved.',
    'MekStation runner weapon-hit tests prove edge_when_headhit replaces a head hit, spends target Edge, preserves the head armor, and damages the replacement location.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('edge_when_tac'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application']
      .evidence,
  ).toContain('before TAC critical processing');
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application']
      .sourceRefs,
  ).not.toEqual(edgeRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-tac-reroll-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    ...megamekEdgeCitations,
    'MekStation hit-location resolution selects edge_when_tac for BattleMech natural-2 hit-location rolls, spends represented Edge, and returns superseded/final location metadata.',
    'MekStation resolveWeaponHit emits Edge reroll metadata before critical-hit processing so edge_when_tac can replace the TAC location before damage resolution.',
    'MekStation runner weapon-hit tests prove edge_when_tac replaces a TAC hit-location result before damage, spends target Edge, and damages the replacement location.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-ko-consciousness-reroll-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('edge_when_ko'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-ko-consciousness-reroll-application'
    ].evidence,
  ).toContain(
    'refuses to spend generic edge without the KO trigger-specific ability',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-ko-consciousness-reroll-application'
    ].sourceRefs,
  ).not.toEqual(edgeRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-ko-consciousness-reroll-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    ...megamekEdgeCitations,
    'MekStation resolvePilotConsciousnessCheck consumes edge_when_ko to reroll failed BattleMech consciousness checks and returns superseded/final roll plus remaining Edge metadata.',
    'MekStation pilot consciousness tests prove edge_when_ko rerolls failed consciousness checks, spends represented Edge, and does not spend generic Edge or passing checks.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-masc-supercharger-reroll-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('MASCFailure and SuperchargerFailure'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-masc-supercharger-reroll-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
    'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
    'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
    'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
    'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
    'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
    'MekStation runner PSR tests prove edge_when_masc_fails rerolls failed MASC and Supercharger checks, spends Edge, and suppresses fall, critical-hit, and destruction aftermath when the reroll passes.',
  ]);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['critical-prevention-application']
      .sourceRefs,
  ).toEqual(edgeRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['critical-prevention-application'],
  ).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining(
      'Generic critical-hit negation is not a source-backed BattleMech resolver',
    ),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'critical-prevention-edge-explosion-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('edge_when_explosion'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'critical-prevention-edge-explosion-application'
    ].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek PilotOptions registers Edge as a point pool plus trigger-specific Mek and aerospace Edge options.',
    'MegaMek OptionsConstants defines Edge and the Mek trigger option ids for head hits, TACs, KO checks, explosions, and MASC failures.',
    'MegaMek Crew.hasEdgeRemaining and decreaseEdge consume the Edge point pool through OptionsConstants.EDGE.',
    'MegaMek Mek hit-location resolution consumes Edge for TAC and head-hit rerolls when the corresponding trigger option is enabled.',
    'MegaMek TWGameManager consumes EDGE_WHEN_KO to reroll failed BattleMech crew knockout checks while Edge remains available.',
    'MegaMek TWGameManager consumes EDGE_WHEN_EXPLOSION to reroll explosive equipment critical slots when another hittable critical slot exists.',
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'MekStation critical-slot selection consumes edge_when_explosion to spend represented Edge and redirect explosive ammo critical-slot hits when another hittable slot exists.',
    'MekStation critical-hit resolution carries remaining Edge points through repeated critical-slot selection and returns the final Edge total to callers.',
    'MekStation critical-hit tests prove edge_when_explosion avoids an ammo critical when another slot is hittable and does not spend Edge without the trigger or alternate slot.',
    'MekStation runner critical-hit event tests prove edge_when_explosion avoids a crit-induced ammo explosion through resolveWeaponHit.',
  ]);
  expect(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-application']).toEqual({
    spaIds: ['edge'],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-head-hit-reroll-application'],
  ).toEqual({
    spaIds: [],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['edge-tac-reroll-application'],
  ).toEqual({
    spaIds: [],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'edge-ko-consciousness-reroll-application'
    ],
  ).toEqual({
    spaIds: [],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'edge-masc-supercharger-reroll-application'
    ],
  ).toEqual({
    spaIds: [],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['critical-prevention-application'],
  ).toEqual({
    spaIds: ['edge'],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'critical-prevention-edge-explosion-application'
    ],
  ).toEqual({
    spaIds: [],
    quirkIds: [],
  });
});
