import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_RANGE_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRangeRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_RANGE_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_RANGE_SOURCE_VERSION,
  };
}

const MEGAMEK_RANGE_BRACKET_SOURCE_REF = megamekRangeRef(
  'MegaMek RangeType.calculateRangeBracket classifies distance as minimum, short, medium, long, extreme, LOS, or out of range from the weapon range array and active optional range rules.',
  'megamek/src/megamek/common/RangeType.java#L100-L160',
);

const MEGAMEK_RANGE_MODIFIER_SOURCE_REF = megamekRangeRef(
  'MegaMek Compute.getRangeMods applies attacker short, medium, long, and extreme range modifiers after resolving the active range bracket.',
  'megamek/src/megamek/common/compute/Compute.java#L1612-L1647',
);

export const MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS = [
  MEGAMEK_RANGE_BRACKET_SOURCE_REF,
  MEGAMEK_RANGE_MODIFIER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_EXTREME_RANGE_BRACKET_SOURCE_REFS = [
  MEGAMEK_RANGE_BRACKET_SOURCE_REF,
  megamekRangeRef(
    'MegaMek Compute.getRangeMods reads the TacOps extreme-range option before classifying attack range.',
    'megamek/src/megamek/common/compute/Compute.java#L1313-L1325',
  ),
  MEGAMEK_RANGE_MODIFIER_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_OUT_OF_RANGE_SOURCE_REFS = [
  MEGAMEK_RANGE_BRACKET_SOURCE_REF,
  megamekRangeRef(
    'MegaMek Compute.getRangeMods converts out-of-range attacks into automatic failure before normal attack resolution.',
    'megamek/src/megamek/common/compute/Compute.java#L1483-L1538',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MINIMUM_RANGE_SOURCE_REFS = [
  MEGAMEK_RANGE_BRACKET_SOURCE_REF,
  megamekRangeRef(
    'MegaMek Compute.getRangeMods adds the ground-to-ground minimum range penalty as minRange - distance + 1.',
    'megamek/src/megamek/common/compute/Compute.java#L1712-L1717',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
