export type CombatFeatureSourceKind =
  | 'rulebook'
  | 'megamek-source'
  | 'mekhq-behavior'
  | 'mekstation-deviation';

export interface ICombatFeatureSourceReference {
  readonly kind: CombatFeatureSourceKind;
  readonly citation: string;
  readonly url: string;
  readonly sourceVersion: string;
}

export const MEGAMEK_COMBAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

export const MEKSTATION_WORKING_TREE_SOURCE_VERSION = 'MekStation working-tree';

export function combatFeatureSourceRef(
  kind: CombatFeatureSourceKind,
  citation: string,
  url: string,
  sourceVersion: string,
): ICombatFeatureSourceReference {
  return {
    kind,
    citation,
    url,
    sourceVersion,
  };
}

export function megamekSourceRef(
  citation: string,
  pathWithLines: string,
  sourceVersion = MEGAMEK_COMBAT_SOURCE_VERSION,
): ICombatFeatureSourceReference {
  return combatFeatureSourceRef(
    'megamek-source',
    citation,
    `https://github.com/MegaMek/megamek/blob/${sourceVersion}/${pathWithLines}`,
    sourceVersion,
  );
}

export function megamekSourceRefWithLineAnchor(
  citation: string,
  path: string,
  lineAnchor: string,
  sourceVersion = MEGAMEK_COMBAT_SOURCE_VERSION,
): ICombatFeatureSourceReference {
  return megamekSourceRef(citation, `${path}#${lineAnchor}`, sourceVersion);
}

export function megamekSrcSourceRef(
  citation: string,
  pathWithLines: string,
  sourceVersion = MEGAMEK_COMBAT_SOURCE_VERSION,
): ICombatFeatureSourceReference {
  return megamekSourceRef(
    citation,
    `megamek/src/${pathWithLines}`,
    sourceVersion,
  );
}

export function megamekSrcSourceRefWithLineAnchor(
  citation: string,
  path: string,
  lineAnchor: string,
  sourceVersion = MEGAMEK_COMBAT_SOURCE_VERSION,
): ICombatFeatureSourceReference {
  return megamekSrcSourceRef(citation, `${path}#${lineAnchor}`, sourceVersion);
}

export function megamekPackageSourceRefWithLineAnchor(
  citation: string,
  path: string,
  lineAnchor: string,
  sourceVersion = MEGAMEK_COMBAT_SOURCE_VERSION,
): ICombatFeatureSourceReference {
  return megamekSrcSourceRefWithLineAnchor(
    citation,
    `megamek/${path}`,
    lineAnchor,
    sourceVersion,
  );
}

export function mekstationDeviationSourceRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return combatFeatureSourceRef(
    'mekstation-deviation',
    citation,
    pathWithLines,
    MEKSTATION_WORKING_TREE_SOURCE_VERSION,
  );
}

export function mekstationDeviationSourceRefWithLineAnchor(
  citation: string,
  path: string,
  lineAnchor: string,
  remapUrl?: (url: string) => string,
): ICombatFeatureSourceReference {
  const url = `${path}#${lineAnchor}`;

  return mekstationDeviationSourceRef(citation, remapUrl ? remapUrl(url) : url);
}

export function rulebookSourceRef(
  citation: string,
  url: string,
  sourceVersion: string,
): ICombatFeatureSourceReference {
  return combatFeatureSourceRef('rulebook', citation, url, sourceVersion);
}
