import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import { remapMekStationSourceRefs } from './CombatSourceRefAnchorRemap';
import { sourceRefsFromSupportMapRefs } from './CombatValidationRequirementSupport.registry';
import {
  COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES,
  type CombatRequirementId,
  type ICombatRequirementPrimaryAuthority,
  type ICombatRequirementSupportEntry,
} from './CombatValidationRequirementSupport.types';

function primaryAuthorityFor(
  id: CombatRequirementId,
): ICombatRequirementPrimaryAuthority {
  return COMBAT_REQUIREMENT_PRIMARY_AUTHORITIES[id];
}

export function integrated(
  id: CombatRequirementId,
  evidence: string,
  supportMapRefs: readonly string[],
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatRequirementSupportEntry {
  return {
    id,
    level: 'integrated',
    evidence,
    primaryAuthority: primaryAuthorityFor(id),
    supportMapRefs,
    sourceRefs: sourceRefs
      ? remapMekStationSourceRefs(sourceRefs)
      : sourceRefsFromSupportMapRefs(supportMapRefs),
  };
}

export function outOfScope(
  id: CombatRequirementId,
  evidence: string,
  gap: string,
  supportMapRefs: readonly string[],
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatRequirementSupportEntry {
  return {
    id,
    level: 'out-of-scope',
    evidence,
    gap,
    primaryAuthority: primaryAuthorityFor(id),
    supportMapRefs,
    sourceRefs: sourceRefs
      ? remapMekStationSourceRefs(sourceRefs)
      : sourceRefsFromSupportMapRefs(supportMapRefs),
  };
}
