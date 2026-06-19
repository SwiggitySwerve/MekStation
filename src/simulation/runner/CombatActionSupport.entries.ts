import type {
  CombatActionLayer,
  ICombatActionSupportEntry,
} from './CombatActionSupport.types';
import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import {
  remapMekStationSourceRefUrl,
  remapMekStationSourceRefs,
} from './CombatSourceRefAnchorRemap';

export function integrated(
  id: string,
  layer: CombatActionLayer,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatActionSupportEntry {
  return sourceRefs
    ? {
        id,
        layer,
        level: 'integrated',
        evidence,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, layer, level: 'integrated', evidence };
}

export function outOfScope(
  id: string,
  layer: CombatActionLayer,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatActionSupportEntry {
  return sourceRefs
    ? {
        id,
        layer,
        level: 'out-of-scope',
        evidence,
        gap,
        sourceRefs: remapMekStationSourceRefs(sourceRefs),
      }
    : { id, layer, level: 'out-of-scope', evidence, gap };
}

export function mekstationDeviationSourceRef(
  ...[citation, path, lineRange]: readonly [
    citation: string,
    path: string,
    lineRange: string,
  ]
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    ...{
      url: remapMekStationSourceRefUrl(`${path}#${lineRange}`),
      sourceVersion: 'MekStation working-tree',
    },
  };
}
