import { QUIRK_CATALOG } from '@/utils/gameplay/quirkModifiers';
import { SPA_CATALOG } from '@/utils/gameplay/spaModifiers';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
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

function assignedResolverIdsForSpaId(spaId: string): readonly string[] {
  return Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS)
    .flatMap(([resolverId, assignment]) =>
      (assignment.spaIds as readonly string[]).includes(spaId)
        ? [resolverId]
        : [],
    )
    .sort();
}

function canonicalSpaSourceCitations(spaId: string): readonly string[] {
  return (
    CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId].sourceRefs?.map(
      ({ citation }) => citation,
    ) ?? []
  );
}

function helperOnlyCanonicalSpaAssignments(): readonly string[] {
  return Object.entries(PILOT_MODIFIER_RESOLVER_ASSIGNMENTS)
    .flatMap(([resolverId, assignment]) =>
      assignment.spaIds
        .filter(
          (spaId) =>
            CANONICAL_SPA_COMBAT_SCOPE_SUPPORT[spaId]?.level === 'helper-only',
        )
        .map((spaId) => `${resolverId}.spa.${spaId}`),
    )
    .sort();
}

const INTEGRATED_RESOLVER_SPA_ASSIGNMENT_EXCEPTIONS: Readonly<
  Record<string, readonly string[]>
> = {
  'nightwalker-light-movement-application': ['tm_nightwalker'],
  'dfa-miss-bioware-pilot-damage-avoidance': ['dermal_armor', 'tsm_implant'],
  'dermal-armor-head-hit-pilot-damage-suppression': ['dermal_armor'],
  'eagle-eyes-active-probe-range-application': ['eagle_eyes'],
  'env-specialist-light-physical-to-hit-application': ['env_specialist'],
  'env-specialist-light-ranged-to-hit-application': ['env_specialist'],
  'env-specialist-fog-ranged-to-hit-application': ['env_specialist'],
  'env-specialist-rain-ranged-to-hit-application': ['env_specialist'],
  'env-specialist-wind-ranged-to-hit-application': ['env_specialist'],
  'env-specialist-snow-ranged-to-hit-application': ['env_specialist'],
  'triple-core-processor-aimed-shot-application': [
    'triple_core_processor',
    'vdni',
    'bvdni',
  ],
  'triple-core-processor-initiative-application': [
    'triple_core_processor',
    'vdni',
    'bvdni',
  ],
  'zweihander-punch-physical-application': ['zweihander'],
  'vdni-bvdni-ranged-to-hit-application': ['vdni', 'bvdni'],
  'vdni-internal-damage-neural-feedback-application': ['vdni'],
  'bvdni-critical-hit-neural-feedback-application': ['bvdni'],
  'vdni-piloting-target-number-application': ['vdni'],
  'comm-implant-indirect-fire-spotter-application': [
    'comm_implant',
    'boost_comm_implant',
  ],
  'proto-dni-ranged-to-hit-application': ['proto_dni'],
  'proto-dni-piloting-target-number-application': ['proto_dni'],
};

function isAllowedIntegratedResolverSpaAssignment(
  resolverId: string,
  spaId: string,
): boolean {
  return (
    INTEGRATED_RESOLVER_SPA_ASSIGNMENT_EXCEPTIONS[resolverId]?.includes(
      spaId,
    ) ?? false
  );
}

type CombatSupportSourceRef = NonNullable<
  ICombatFeatureSupportEntry['sourceRefs']
>[number];

function sourceRefsFrom(
  entries: readonly ICombatFeatureSupportEntry[],
): readonly CombatSupportSourceRef[] {
  return entries.flatMap((entry) => [...(entry.sourceRefs ?? [])]);
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
  const canonicalSpaSupport = CANONICAL_SPA_COMBAT_SCOPE_SUPPORT as Record<
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
          .filter((spaId) => {
            if (isAllowedIntegratedResolverSpaAssignment(resolverId, spaId)) {
              return false;
            }

            return (
              (spaSupport[spaId] ?? canonicalSpaSupport[spaId])?.level !==
              'integrated'
            );
          })
          .map((spaId) => `${resolverId}.spa.${spaId}`),
        ...assignment.quirkIds
          .filter((quirkId) => quirkSupport[quirkId]?.level !== 'integrated')
          .map((quirkId) => `${resolverId}.quirk.${quirkId}`),
      ];
    })
    .sort();
}

export {
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
};
export type { CombatSupportSourceRef, ICombatFeatureSupportEntry };
