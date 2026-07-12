/**
 * Explicit support matrix for combat-active pilot SPAs and mech quirks.
 *
 * The catalog validation suite uses this as the line between implemented
 * behavior and known feature gaps. Adding a combat-active SPA or quirk without
 * updating this file should fail fast instead of letting a broad
 * known-limitation filter hide the missing rule.
 */

import type {
  CombatFeatureSourceKind,
  ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

import { remapMekStationSourceRefs } from './CombatSourceRefAnchorRemap';

export type {
  CombatFeatureSourceKind,
  ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';

export type CombatFeatureSupportLevel =
  | 'integrated'
  | 'helper-only'
  | 'unsupported'
  | 'out-of-scope';

export interface ICombatFeatureSupportEntry {
  readonly id: string;
  readonly level: CombatFeatureSupportLevel;
  readonly evidence: string;
  readonly gap?: string;
  readonly sourceRefs?: readonly ICombatFeatureSourceReference[];
}

export function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'integrated',
        evidence,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'integrated', evidence };
}

export function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'out-of-scope',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'out-of-scope', evidence, gap };
}

export function unsupported(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'unsupported',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'unsupported', evidence, gap };
}

export function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? {
        id,
        level: 'helper-only',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, level: 'helper-only', evidence, gap };
}
