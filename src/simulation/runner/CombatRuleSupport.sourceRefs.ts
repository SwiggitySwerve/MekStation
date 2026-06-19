import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

export const MEGAMEK_HEAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
export const MEGAMEK_TO_HIT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
export const MEGAMEK_PHYSICAL_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
export const MEGAMEK_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
export const MEGAMEK_TERRAIN_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
export const MEGAMEK_EMP_MINEFIELD_SOURCE_VERSION =
  '55584ec7529b944fca3216965697e9fa1115dced';

export function megamekHeatSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_HEAT_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_HEAT_SOURCE_VERSION,
  };
}

export function megamekPhysicalSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
  };
}

export function megamekTerrainSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
  };
}

export function megamekEmpMinefieldSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EMP_MINEFIELD_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_EMP_MINEFIELD_SOURCE_VERSION,
  };
}

export function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineRange}`,
    sourceVersion: 'MekStation working-tree',
  };
}
