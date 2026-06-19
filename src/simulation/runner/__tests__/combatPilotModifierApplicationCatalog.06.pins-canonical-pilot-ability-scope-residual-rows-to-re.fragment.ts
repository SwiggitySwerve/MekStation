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

it('pins canonical pilot ability scope residual rows to represented slices or catalog blockers', () => {
  const residualRows = [
    'boost_comm_implant',
    'comm_implant',
    'proto_dni',
    'triple_core_processor',
    'zweihander',
  ] as const;

  const residualDetails = Object.fromEntries(
    residualRows.map((spaId) => {
      const support = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId];
      const assignedResolvers = assignedResolverIdsForSpaId(spaId);

      return [
        spaId,
        {
          level: support.level,
          evidence: support.evidence,
          gap: support.gap,
          assignedResolvers,
          representedSlice: assignedResolvers.length > 0,
        },
      ];
    }),
  );

  expect(residualDetails).toEqual({
    boost_comm_implant: {
      level: 'integrated',
      evidence: expect.stringContaining('represented LOS spotter'),
      gap: undefined,
      assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
      representedSlice: true,
    },
    comm_implant: {
      level: 'integrated',
      evidence: expect.stringContaining('represented LOS spotter'),
      gap: undefined,
      assignedResolvers: ['comm-implant-indirect-fire-spotter-application'],
      representedSlice: true,
    },
    proto_dni: {
      level: 'integrated',
      evidence: expect.stringContaining('without inferring VDNI'),
      gap: undefined,
      assignedResolvers: [
        'proto-dni-piloting-target-number-application',
        'proto-dni-ranged-to-hit-application',
      ],
      representedSlice: true,
    },
    triple_core_processor: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'represented called-shot Targeting Computer -1 aimed-shot relief',
      ),
      gap: undefined,
      assignedResolvers: [
        'triple-core-processor-aimed-shot-application',
        'triple-core-processor-initiative-application',
      ],
      representedSlice: true,
    },
    zweihander: {
      level: 'integrated',
      evidence: expect.stringContaining(
        'every official standalone physical-weapon declaration',
      ),
      gap: undefined,
      assignedResolvers: ['zweihander-punch-physical-application'],
      representedSlice: true,
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
    Object.entries(residualDetails).filter(
      ([spaId, { level, representedSlice }]) =>
        spaId !== 'triple_core_processor' &&
        spaId !== 'proto_dni' &&
        spaId !== 'boost_comm_implant' &&
        spaId !== 'comm_implant' &&
        !(spaId === 'zweihander' && representedSlice === true) &&
        level !== 'helper-only' &&
        level !== 'unsupported' &&
        level !== 'out-of-scope',
    ),
  ).toEqual([]);
});
