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

it('keeps toughness and consciousness SPA boundaries source-backed and alias-safe', () => {
  const ironManRefs = SPA_COMBAT_SUPPORT['iron-man'].sourceRefs ?? [];
  const painResistanceRefs =
    SPA_COMBAT_SUPPORT['pain-resistance'].sourceRefs ?? [];
  const consciousnessRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['consciousness-application']
      .sourceRefs ?? [];
  const rpgToughnessConsciousnessRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'rpg-toughness-consciousness-application'
    ].sourceRefs ?? [];
  const painResistanceToHitRefs =
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-pain-resistance-to-hit-application'
    ].sourceRefs ?? [];
  const toughnessRefs = SPA_COMBAT_SUPPORT.toughness.sourceRefs ?? [];

  expect(SPA_COMBAT_SUPPORT['iron-man']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('ammunition-explosion'),
  });
  expect(SPA_COMBAT_SUPPORT['pain-resistance']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('wake-up relief'),
  });
  expect(SPA_COMBAT_SUPPORT.toughness).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('explicit assigned-pilot rpgToughness'),
    gap: expect.stringContaining(
      'explicit assigned-pilot rpgToughness/pilotToughness',
    ),
  });
  expect(SPA_COMBAT_SUPPORT.toughness.evidence).toContain(
    'Legacy pilotAbilities.toughness ability strings',
  );
  expect(SPA_COMBAT_SUPPORT.toughness.gap).toContain(
    'Legacy toughness ability aliases are excluded',
  );
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'rpg-toughness-consciousness-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('explicit numeric pilotToughness'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'rpg-toughness-consciousness-application'
    ].evidence,
  ).toContain(
    'legacy toughness ability aliases do not imply numeric RPG Toughness',
  );
  expect(SPA_COMBAT_SUPPORT['iron-will']).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('local SPA catalog defines Iron Will'),
    gap: expect.stringContaining('excluded from the official BattleMech'),
  });
  expect(
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-pain-resistance-to-hit-application'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('not ranged to-hit wound-penalty relief'),
  });
  expect(ironManRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
    'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
    'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
    'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
    'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
    'MekStation getEffectiveWounds leaves pilot wounds unchanged so Pain Resistance no longer reduces ranged to-hit wound penalties.',
    'MekStation getConsciousnessCheckModifier applies source-backed Pain Resistance ids only; Iron Man, Iron Will, and Toughness do not lower consciousness target numbers.',
    'MekStation resolveBattleMechAmmoExplosionPilotDamage reduces ammo-explosion pilot damage only for source-backed Pain Resistance or Iron Man ids.',
    'MekStation legacy aliases still collapse toughness into pain_resistance and iron-will into iron_man for generic canonicalization, so source-backed resolvers must bypass those aliases.',
  ]);
  expect(painResistanceRefs.map(({ citation }) => citation)).toEqual([
    'MegaMek TWGameManager lowers consciousness target numbers by numeric crew toughness only when the RPG Toughness game option is enabled, then adds +1 to Pain Resistance consciousness rolls.',
    'MegaMek TWGameManager adds +1 to Pain Resistance wake-up rolls.',
    'MegaMek TWGameManager reduces ammunition-explosion pilot damage by 1 for Pain Resistance or Iron Man.',
    'MegaMek PilotOptions registers Iron Man and Pain Resistance as distinct misc abilities.',
    'MegaMek OptionsConstants defines MISC_IRON_MAN and MISC_PAIN_RESISTANCE as separate ability ids.',
    'MegaMek OptionsConstants defines RPG_TOUGHNESS as a separate game-option id.',
    'MegaMek GameOptions registers RPG Toughness as a game option rather than a pilot SPA.',
    'MegaMek Crew stores numeric toughness per crew slot for KO checks.',
    'MegaMek Crew exposes numeric toughness accessors per crew slot.',
    'MegaMek MULParser imports crew toughness only when RPG Toughness is enabled.',
    'MegaMek option text defines Pain Resistance as +1 consciousness rolls plus ammunition-explosion damage reduction.',
    'MegaMek option text defines Iron Man as ammunition-explosion pilot-hit reduction only.',
    'MegaMek option text defines RPG Toughness as a numeric pilot toughness bonus for consciousness check targets.',
    'MekStation getEffectiveWounds leaves pilot wounds unchanged so Pain Resistance no longer reduces ranged to-hit wound penalties.',
    'MekStation getConsciousnessCheckModifier applies source-backed Pain Resistance ids only; Iron Man, Iron Will, and Toughness do not lower consciousness target numbers.',
    'MekStation resolveBattleMechAmmoExplosionPilotDamage reduces ammo-explosion pilot damage only for source-backed Pain Resistance or Iron Man ids.',
    'MekStation legacy aliases still collapse toughness into pain_resistance and iron-will into iron_man for generic canonicalization, so source-backed resolvers must bypass those aliases.',
  ]);
  expect(ironManRefs.map(({ kind }) => kind)).toEqual([
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
  ]);
  expect(painResistanceRefs.map(({ kind }) => kind)).toEqual([
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
    'megamek-source',
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
  ]);
  expect(toughnessRefs).not.toEqual(painResistanceRefs);
  expect(toughnessRefs.map(({ citation }) => citation)).toEqual([
    ...painResistanceRefs.map(({ citation }) => citation).slice(0, 13),
    'MekStation IPilot.rpgToughness carries explicit assigned-pilot RPG Toughness numeric state without inferring it from legacy ability aliases.',
    'MekStation force-assignment preBattleSessionBuilder maps explicit assigned-pilot rpgToughness into GameCreated pilotToughness seeds for combat state initialization.',
    'MekStation skirmish preBattleSessionBuilder maps explicit RPG Toughness snapshots into GameCreated pilotToughness seeds for combat state initialization.',
    'MekStation pre-battle skirmish launch copies assigned IPilot.rpgToughness into the skirmish pilot snapshot and preserves pilotToughness when creating engine game units.',
    'MekStation force-assignment pre-battle session tests prove numeric rpgToughness reaches session unit state and legacy toughness ability aliases do not imply pilotToughness.',
    'MekStation skirmish pre-battle session tests prove numeric RPG Toughness snapshots reach session unit state and non-finite values remain absent.',
    ...painResistanceRefs.map(({ citation }) => citation).slice(13),
  ]);
  expect(toughnessRefs.map(({ kind }) => kind)).toEqual([
    ...painResistanceRefs.map(({ kind }) => kind).slice(0, 13),
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    'mekstation-deviation',
    ...painResistanceRefs.map(({ kind }) => kind).slice(13),
  ]);
  expect(
    SPA_COMBAT_SUPPORT['iron-will'].sourceRefs?.map(({ citation }) => citation),
  ).toEqual([
    'MegaMek PilotOptions registers the source-backed pilot advantage ids in this combat source snapshot; MekStation local-only SPA ids are not part of that registry.',
    'MegaMek OptionsConstants defines the source-backed pilot option constants used by the combat SPA catalog boundary.',
    'MekStation SPA_CATALOG defines local-only combat claims for Acrobat, Natural Grace, Speed Demon, Combat Intuition, Cool Under Fire, Evasive, Multi-Target, Iron Will, and Antagonizer; these must remain out-of-scope until a source-backed combat authority is identified.',
  ]);
  expect(consciousnessRefs).toEqual(painResistanceRefs);
  expect(rpgToughnessConsciousnessRefs).toEqual(toughnessRefs);
  expect(painResistanceToHitRefs).toEqual(painResistanceRefs);
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['consciousness-application'],
  ).toEqual({
    spaIds: ['iron-man', 'pain-resistance'],
    quirkIds: [],
  });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'rpg-toughness-consciousness-application'
    ],
  ).toEqual({ spaIds: [], quirkIds: [] });
  expect(assignedSpaIds()).not.toContain('toughness');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS[
      'legacy-pain-resistance-to-hit-application'
    ],
  ).toEqual({ spaIds: [], quirkIds: [] });
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-calculation'].spaIds,
  ).not.toContain('pain-resistance');
  expect(
    PILOT_MODIFIER_RESOLVER_ASSIGNMENTS['ranged-to-hit-state-hydration'].spaIds,
  ).not.toContain('pain-resistance');
});

it('keeps source-backed pilot modifier refs commit-pinned', () => {
  const refs = sourceRefsFrom([
    SPA_COMBAT_SUPPORT['multi-tasker'],
    SPA_COMBAT_SUPPORT['multi-target'],
    SPA_COMBAT_SUPPORT['iron-man'],
    SPA_COMBAT_SUPPORT['pain-resistance'],
    SPA_COMBAT_SUPPORT.toughness,
    SPA_COMBAT_SUPPORT['iron-will'],
    SPA_COMBAT_SUPPORT['dodge-maneuver'],
    SPA_COMBAT_SUPPORT.shaky_stick,
    SPA_COMBAT_SUPPORT['hopping-jack'],
    SPA_COMBAT_SUPPORT['jumping-jack'],
    SPA_COMBAT_SUPPORT.tm_frogman,
    SPA_COMBAT_SUPPORT.tm_forest_ranger,
    SPA_COMBAT_SUPPORT.tm_mountaineer,
    SPA_COMBAT_SUPPORT.tm_swamp_beast,
    SPA_COMBAT_SUPPORT['cross-country'],
    SPA_COMBAT_SUPPORT['heavy-lifter'],
    SPA_COMBAT_SUPPORT['hot-dog'],
    SPA_COMBAT_SUPPORT['some-like-it-hot'],
    SPA_COMBAT_SUPPORT['tactical-genius'],
    SPA_COMBAT_SUPPORT.edge,
    QUIRK_COMBAT_SUPPORT.command_mech,
    QUIRK_COMBAT_SUPPORT.battle_computer,
    QUIRK_COMBAT_SUPPORT.distracting,
    QUIRK_COMBAT_SUPPORT.low_profile,
    QUIRK_COMBAT_SUPPORT.improved_cooling,
    QUIRK_COMBAT_SUPPORT.poor_cooling,
    QUIRK_COMBAT_SUPPORT.no_cooling,
    QUIRK_COMBAT_SUPPORT.sensor_ghosts,
    QUIRK_COMBAT_SUPPORT.multi_trac,
    QUIRK_COMBAT_SUPPORT.accurate,
    QUIRK_COMBAT_SUPPORT.inaccurate,
    QUIRK_COMBAT_SUPPORT.stable_weapon,
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['multi-target-penalty-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['weapon-to-hit-quirk-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['movement-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-lift-capacity-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-carry-object-capacity-check-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'heavy-lifter-ground-object-weight-gate-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'maneuvering-ace-lateral-movement-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'nightwalker-light-movement-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-defensive-quirk-to-hit-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'legacy-pain-resistance-to-hit-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['called-shot-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-calculation'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['ranged-to-hit-state-hydration'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['psr-spa-target-number-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['initiative-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'triple-core-processor-aimed-shot-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'triple-core-processor-initiative-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['heat-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['consciousness-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-head-hit-reroll-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'edge-masc-supercharger-reroll-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['edge-tac-reroll-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT['critical-prevention-application'],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'critical-prevention-edge-explosion-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'dermal-armor-head-hit-pilot-damage-suppression'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-rate-of-fire-application'
    ],
    PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT[
      'sandblaster-tacops-rapid-fire-application'
    ],
  ]);
  const megamekRefs = refs.filter(
    (sourceRef) => sourceRef.kind === 'megamek-source',
  );
  const mekstationDeviationRefs = refs.filter(
    (sourceRef) => sourceRef.kind === 'mekstation-deviation',
  );
  const pinnedMegaMekVersions = new Set([
    '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
    '55584ec7529b944fca3216965697e9fa1115dced',
  ]);

  expect(refs.length).toBeGreaterThan(0);
  expect(
    megamekRefs.every(
      (sourceRef) =>
        pinnedMegaMekVersions.has(sourceRef.sourceVersion) &&
        sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
        sourceRef.url.includes(sourceRef.sourceVersion) &&
        sourceRef.url.includes('#L'),
    ),
  ).toBe(true);
  expect(
    mekstationDeviationRefs.every(
      (sourceRef) => sourceRef.sourceVersion === 'MekStation working-tree',
    ),
  ).toBe(true);
});
