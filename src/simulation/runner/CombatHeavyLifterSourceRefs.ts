import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_HEAVY_LIFTER_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_HEAVY_LIFTER_SOURCE_VERSION}/${pathWithLines}`,
    sourceVersion: MEGAMEK_HEAVY_LIFTER_SOURCE_VERSION,
  };
}

function mekstationDeviationRef(
  citation: string,
  pathWithLines: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: pathWithLines,
    sourceVersion: 'MekStation working-tree',
  };
}

export const MEGAMEK_HEAVY_LIFTER_SOURCE_REFS = [
  megamekRef(
    'MegaMek MekWithArms.maxGroundObjectTonnage multiplies BattleMech ground-object lift capacity by 1.5 for Heavy Lifter.',
    'megamek/src/megamek/common/units/MekWithArms.java#L97-L115',
  ),
  megamekRef(
    'MegaMek ProtoMek.maxGroundObjectTonnage multiplies ProtoMek ground-object lift capacity by 1.5 for Heavy Lifter.',
    'megamek/src/megamek/common/units/ProtoMek.java#L553-L567',
  ),
  megamekRef(
    'MegaMek OptionsConstants defines PILOT_HVY_LIFTER as hvy_lifter.',
    'megamek/src/megamek/common/options/OptionsConstants.java#L169-L178',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_HEAVY_LIFTER_HELPER_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation calculateGroundObjectLiftCapacity implements the source-backed 5 percent per available hand lift capacity plus Heavy Lifter and TSM pickup multipliers.',
    'src/utils/gameplay/spaModifiers/abilityModifiers.ts#L317-L335',
  ),
  mekstationDeviationRef(
    'MekStation SPA helper tests prove canonical and legacy Heavy Lifter ids apply the 1.5 lift-capacity multiplier without adding carry or throw action support.',
    'src/utils/gameplay/__tests__/spaModifiers.test.ts#L654-L707',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
