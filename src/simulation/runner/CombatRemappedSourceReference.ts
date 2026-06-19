import {
  mekstationDeviationSourceRef,
  mekstationDeviationSourceRefWithLineAnchor,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { remapMekStationSourceRefUrl } from './CombatSourceRefAnchorRemap';

export function remappedMekStationDeviationSourceRef(
  citation: string,
  path: string,
  lineAnchor?: string,
): ICombatFeatureSourceReference {
  if (lineAnchor === undefined) {
    const anchorIndex = path.indexOf('#');

    if (anchorIndex < 0) {
      return mekstationDeviationSourceRef(
        citation,
        remapMekStationSourceRefUrl(path),
      );
    }

    return mekstationDeviationSourceRefWithLineAnchor(
      citation,
      path.slice(0, anchorIndex),
      path.slice(anchorIndex + 1),
      remapMekStationSourceRefUrl,
    );
  }

  return mekstationDeviationSourceRefWithLineAnchor(
    citation,
    path,
    lineAnchor,
    remapMekStationSourceRefUrl,
  );
}
