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

it('keeps unresolved canonical SPA rows visible unless a focused resolver consumes them', () => {
  const canonicalBoundaryRows = [
    'boost_comm_implant',
    'comm_implant',
    'proto_dni',
    'triple_core_processor',
    'zweihander',
  ] as const;

  expect(
    Object.fromEntries(
      canonicalBoundaryRows.map((spaId) => {
        const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
        return [
          spaId,
          {
            level: support.level,
            gap: support.gap,
            assignedResolvers: assignedResolverIdsForSpaId(spaId),
          },
        ];
      }),
    ),
  ).toEqual({
    boost_comm_implant: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
    },
    comm_implant: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
    },
    proto_dni: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: [
        'proto-dni-piloting-target-number-application',
        'proto-dni-ranged-to-hit-application',
      ],
    },
    triple_core_processor: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: [
        'triple-core-processor-aimed-shot-application',
        'triple-core-processor-initiative-application',
      ],
    },
    zweihander: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: ['zweihander-punch-physical-application'],
    },
  });
  for (const spaId of canonicalBoundaryRows) {
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].gap ?? '').not.toContain(
      'No combat support entry or resolver consumes this canonical SPA id yet',
    );
  }
  const representedImplantRows = {
    boost_comm_implant: {
      evidence: [
        'indirect-fire relief',
        'C3i access for any crewed unit',
        'represented BattleMech C3i network state',
      ],
      citations: ['ComputeToHit', 'Entity.hasC3i', 'GameCreated'],
    },
    comm_implant: {
      evidence: ['indirect-fire relief', 'Infantry-only'],
      citations: ['ComputeToHit', 'TWGameManager'],
    },
  } as const;

  for (const [spaId, expectations] of Object.entries(representedImplantRows)) {
    const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
    const citations = support.sourceRefs?.map(({ citation }) => citation) ?? [];

    expect(support.level).toBe('integrated');
    expect(support.gap).toBeUndefined();
    expect(assignedResolverIdsForSpaId(spaId)).toEqual(
      spaId === 'comm_implant' || spaId === 'boost_comm_implant'
        ? ['comm-implant-indirect-fire-spotter-application']
        : [],
    );
    for (const text of expectations.evidence) {
      expect(support.evidence).toContain(text);
    }
    for (const text of expectations.citations) {
      expect(citations).toEqual(
        expect.arrayContaining([expect.stringContaining(text)]),
      );
    }
  }
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.dermal_camo_armor).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining('Infantry armor/readout camo state'),
    gap: expect.stringContaining('infantry/personnel concealment'),
  });
  expect(assignedResolverIdsForSpaId('dermal_camo_armor')).toEqual([]);

  expect(
    Object.fromEntries(
      ['vdni', 'bvdni'].map((spaId) => {
        const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
        return [
          spaId,
          {
            level: support.level,
            gap: support.gap,
            assignedResolvers: assignedResolverIdsForSpaId(spaId),
          },
        ];
      }),
    ),
  ).toEqual({
    vdni: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: [
        'triple-core-processor-aimed-shot-application',
        'triple-core-processor-initiative-application',
        'vdni-bvdni-ranged-to-hit-application',
        'vdni-internal-damage-neural-feedback-application',
        'vdni-piloting-target-number-application',
      ],
    },
    bvdni: {
      level: 'integrated',
      gap: undefined,
      assignedResolvers: [
        'bvdni-critical-hit-neural-feedback-application',
        'triple-core-processor-aimed-shot-application',
        'triple-core-processor-initiative-application',
        'vdni-bvdni-ranged-to-hit-application',
      ],
    },
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('source-backed runtime branches'),
  });
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.env_specialist.gap).toBeUndefined();
  expect(assignedResolverIdsForSpaId('env_specialist')).toEqual([
    'env-specialist-fog-ranged-to-hit-application',
    'env-specialist-light-physical-to-hit-application',
    'env-specialist-light-ranged-to-hit-application',
    'env-specialist-rain-ranged-to-hit-application',
    'env-specialist-snow-ranged-to-hit-application',
    'env-specialist-wind-ranged-to-hit-application',
  ]);

  expect(
    Object.fromEntries(
      [
        'eagle_eyes',
        'env_specialist',
        'zweihander',
        'vdni',
        'bvdni',
        'comm_implant',
        'boost_comm_implant',
        'dermal_camo_armor',
        'triple_core_processor',
        'proto_dni',
      ].map((spaId) => {
        const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
        return [
          spaId,
          {
            evidence: support.evidence,
            gap: support.gap,
            sourceCitations: canonicalSpaSourceCitations(spaId),
          },
        ];
      }),
    ),
  ).toEqual({
    eagle_eyes: {
      evidence: expect.stringContaining('detonation target-number relief'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'MegaMek TWGameManager adds +2 to minefield detonation target numbers when an entity has MISC_EAGLE_EYES.',
        'MekStation canonical miscellaneous SPA catalog defines eagle_eyes as a sensors and minefield-detection row.',
        'MekStation movement behavior coverage proves Eagle Eyes prevents represented minefield detonation on a roll that would detonate without the SPA.',
      ]),
    },
    env_specialist: {
      evidence: expect.stringContaining('source-backed runtime branches'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'MekStation canonical miscellaneous SPA catalog defines env_specialist as a Fog/Light/Rain/Snow/Wind designation row with a to-hit combat pipeline.',
        'MekStation designation option coverage proves env_specialist exposes exactly Fog, Light, Rain, Snow, and Wind choices rather than generic terrain-only values such as vacuum, underground, or low_gravity.',
      ]),
    },
    zweihander: {
      evidence: expect.stringContaining(
        'every official standalone physical-weapon declaration',
      ),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'MegaMek BipedMek.canZweihander requires the SPA, both hand actuators, both arms intact, no arm weapons fired, and not prone.',
        'MegaMek Zweihander punch and club damage add floor(weight / 10) when the two-handed declaration is active.',
        'MegaMek applyZweihanderSelfDamage applies arm critical self-damage and queues a Zweihander miss PSR when the declared two-handed attack misses.',
        'MekStation canonical piloting SPA catalog defines zweihander as a two-handed weapon strike with extra damage at a to-hit penalty.',
      ]),
    },
    vdni: {
      evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'MekStation bioware SPA table defines VDNI and Buffered VDNI as canonical neural-interface rows with to-hit and PSR pipelines.',
        'MekStation emits NeuralInterfaceStateChanged events so represented jack-in and jack-out state can be replayed without assuming implants are always connected.',
        'MekStation unit-state reducer coverage proves represented VDNI/BVDNI jack-out and jack-in events update neuralInterfaceActive and ignore unknown units.',
      ]),
    },
    bvdni: {
      evidence: expect.stringContaining('NeuralInterfaceStateChanged'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'MekStation bioware SPA table defines VDNI and Buffered VDNI as canonical neural-interface rows with to-hit and PSR pipelines.',
        'MekStation emits NeuralInterfaceStateChanged events so represented jack-in and jack-out state can be replayed without assuming implants are always connected.',
        'MekStation unit-state reducer coverage proves represented VDNI/BVDNI jack-out and jack-in events update neuralInterfaceActive and ignore unknown units.',
      ]),
    },
    comm_implant: {
      evidence: expect.stringContaining('represented LOS spotter'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'Current MegaMek OptionsConstants defines comm_implant and boost_comm_implant as Manei Domini option ids.',
        'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
        'Current MegaMek TWGameManager applies comm-implant minefield detonation relief only to Infantry units.',
        'MekStation bioware SPA table defines Cybernetic Comm Implant and Boosted Comm Implant as canonical spotting, mine-spotting, and C3i-node rows.',
        'MekStation represented indirect-fire resolver applies Comm Implant and Boosted Comm Implant as source-backed LOS spotter target-number relief.',
      ]),
    },
    boost_comm_implant: {
      evidence: expect.stringContaining('C3i access for any crewed unit'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'Current MegaMek ComputeToHit applies comm_implant and boost_comm_implant as -1 indirect LRM spotter target-number relief.',
        'Current MegaMek Entity.hasC3i treats boosted comm implant as C3i access for any crewed unit after mounted C3i equipment checks.',
        'MekStation bioware SPA table defines Cybernetic Comm Implant and Boosted Comm Implant as canonical spotting, mine-spotting, and C3i-node rows.',
        'MekStation hydrateC3EquipmentFromFullUnit projects boost_comm_implant pilot ability state into represented BattleMech C3i network state.',
        'MekStation GameCreated replay coverage proves raw session units with Boosted Comm Implant pilot ability state derive represented C3i networks without explicit mounted C3 equipment.',
        'MekStation runner coverage proves two hydrated BattleMechs with boost_comm_implant seed a represented C3i network without manual authoring.',
      ]),
    },
    dermal_camo_armor: {
      evidence: expect.stringContaining('no BattleMech attacker to-hit'),
      gap: expect.stringContaining(
        'infantry/personnel concealment validation matrix',
      ),
      sourceCitations: expect.arrayContaining([
        'MegaMek OptionsConstants defines dermal_camo_armor as a Manei Domini option id.',
        'MegaMek Infantry.getArmorDesc treats dermal_camo_armor as infantry camo armor display state.',
        'MegaMek InfantryReadout renders dermal_camo_armor as infantry Camo armor capability when sneak camo is absent.',
        'MekStation bioware SPA table defines Dermal Camouflage Armor as a canonical concealment/to-hit implant row.',
      ]),
    },
    triple_core_processor: {
      evidence: expect.stringContaining(
        'represented called-shot Targeting Computer -1 aimed-shot relief',
      ),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'MegaMek Player.getTCPInitBonus gives a TCP plus VDNI/BVDNI pilot a +2 initiative component, adds +1 for command/C3/communications equipment, and subtracts represented penalties such as shutdown, ECM, and EMI.',
        'MegaMek Entity.hasTCPAimedShotCapability requires Triple-Core Processor plus VDNI or Buffered VDNI before granting targeting-computer-style aimed-shot capability.',
        'MegaMek ComputeAttackerToHitMods applies the TCP plus VDNI aimed-shot path as targeting-computer eligibility, with an extra -1 only when an actual targeting computer is also present.',
        'MekStation hydrateTargetingComputerEquipmentFromFullUnit projects mounted Targeting Computer equipment and critical-slot signals into explicit combat state without conflating them with Triple-Core Processor SPA state.',
        'MekStation runner to-hit coverage proves actual Targeting Computer equipment applies without Triple-Core Processor and does not double-apply when TCP aimed-shot relief is also eligible.',
        'MekStation bioware SPA table defines Triple-Core Processor and Filtration Implants as canonical initiative, to-hit, and environmental-hazard rows.',
      ]),
    },
    proto_dni: {
      evidence: expect.stringContaining('without inferring VDNI'),
      gap: undefined,
      sourceCitations: expect.arrayContaining([
        'Current MegaMek ComputeAttackerToHitMods applies Prototype DNI as -2 ranged/gunnery target-number relief when active DNI is available.',
        'Current MegaMek Entity.hasDNIImplant includes proto_dni in the active DNI gate shared by VDNI and Buffered VDNI.',
        'Current MegaMek Mek.getBasePilotingRoll applies Prototype DNI as -3 BattleMech piloting target-number relief when active DNI is available.',
        'Current MegaMek TWDamageManager neural-feedback runtime checks active DNI plus MD_VDNI and excludes Buffered VDNI/Pain Shunt; it does not branch on MD_PROTO_DNI.',
        'MekStation bioware SPA table defines Prototype Direct Neural Interface as a canonical early-generation DNI row with to-hit and PSR pipelines.',
      ]),
    },
  });

  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.filtration_implants).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'toxin and low-atmosphere environmental-hazard immunity only',
    ),
    gap: expect.stringContaining(
      'environment/personnel hazard validation matrix',
    ),
  });
  expect(assignedResolverIdsForSpaId('filtration_implants')).toEqual([]);
  expect(canonicalSpaSourceCitations('filtration_implants')).toEqual(
    expect.arrayContaining([
      'MekStation bioware SPA table defines Triple-Core Processor and Filtration Implants as canonical initiative, to-hit, and environmental-hazard rows.',
    ]),
  );

  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.oblique_artillery).toMatchObject({
    level: 'out-of-scope',
    evidence: expect.stringContaining(
      'indirect-fire to-hit penalties, not artillery scatter',
    ),
    gap: expect.stringContaining('artillery/scatter validation matrix'),
  });
  expect(canonicalSpaSourceCitations('oblique_artillery')).toEqual(
    expect.arrayContaining([
      'MekStation canonical gunnery SPA catalog defines oblique_artillery as reduced artillery scatter.',
      'MekStation BattleMech combat catalog keeps oblique_artillery distinct from the integrated oblique_attacker indirect-fire row.',
    ]),
  );

  expect(
    Object.fromEntries(
      (
        ['dermal_armor', 'eagle_eyes', 'tm_nightwalker', 'tsm_implant'] as const
      ).map((spaId) => [
        spaId,
        {
          level: CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].level,
          assignedResolvers: assignedResolverIdsForSpaId(spaId),
        },
      ]),
    ),
  ).toEqual({
    dermal_armor: {
      level: 'integrated',
      assignedResolvers: [
        'dermal-armor-head-hit-pilot-damage-suppression',
        'dfa-miss-bioware-pilot-damage-avoidance',
      ],
    },
    eagle_eyes: {
      level: 'integrated',
      assignedResolvers: [
        'eagle-eyes-active-probe-range-application',
        'eagle-eyes-minefield-detonation-application',
      ],
    },
    tm_nightwalker: {
      level: 'integrated',
      assignedResolvers: ['nightwalker-light-movement-application'],
    },
    tsm_implant: {
      level: 'integrated',
      assignedResolvers: ['dfa-miss-bioware-pilot-damage-avoidance'],
    },
  });
});
