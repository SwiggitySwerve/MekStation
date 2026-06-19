import type {
  IPhysicalLegalityGateSupportEntry,
  PhysicalLegalityAttackFamily,
} from './CombatPhysicalLegalityGateSupport.types';

import { sourceRefsForAuthority } from './CombatPhysicalLegalityGateSupport.sourceRefs';

export function integrated(
  id: string,
  attackFamily: PhysicalLegalityAttackFamily,
  evidence: string,
  authority: string,
): IPhysicalLegalityGateSupportEntry {
  return {
    id,
    attackFamily,
    authority,
    level: 'integrated',
    evidence,
    sourceRefs: sourceRefsForAuthority(authority),
  };
}

export function outOfScope(
  id: string,
  attackFamily: PhysicalLegalityAttackFamily,
  evidence: string,
  gap: string,
  authority: string,
): IPhysicalLegalityGateSupportEntry {
  return {
    id,
    attackFamily,
    authority,
    level: 'out-of-scope',
    evidence,
    gap,
    sourceRefs: sourceRefsForAuthority(authority),
  };
}
