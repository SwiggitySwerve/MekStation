import type { ISerializedStructure } from '@/types/unit/UnitSerialization';

import {
  InternalStructureType,
  mapDonorStructureType,
} from '@/types/construction/InternalStructureType';
import {
  getLocationsForConfig,
  MechConfiguration,
  MechLocation,
} from '@/types/construction/MechConfigurationSystem';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

/** Optional source facts carried by configuration-aware structure callers. */
export interface IStructureWeightContext {
  readonly configuration?: MechConfiguration;
  readonly frankenStructure?: ISerializedStructure;
}

// Mek.java:1052-1060 in native index order. A tripod's ninth location has zero share.
// The aliases identify the same native limb indices in Quad/QuadVee configurations.
const STRUCTURE_SECTIONS = [
  ['HEAD', undefined, 0.05],
  ['CENTER_TORSO', undefined, 0.25],
  ['RIGHT_TORSO', undefined, 0.15],
  ['LEFT_TORSO', undefined, 0.15],
  ['RIGHT_ARM', 'FRONT_RIGHT_LEG', 0.1],
  ['LEFT_ARM', 'FRONT_LEFT_LEG', 0.1],
  ['RIGHT_LEG', 'REAR_RIGHT_LEG', 0.1],
  ['LEFT_LEG', 'REAR_LEFT_LEG', 0.1],
] as const;

/** BattleMech structure mass; callers retain their own admission checks.
 * @spec openspec/specs/internal-structure-system/spec.md
 */
export function calculateStructureWeight(
  tonnage: number,
  structureType: InternalStructureType,
  context?: IStructureWeightContext,
): number {
  const structure = context?.frankenStructure;
  const configuration = context?.configuration ?? MechConfiguration.BIPED;
  if (structure?.typeByLocation === undefined) {
    return nativeFullStructureWeight(tonnage, structureType, configuration);
  }

  const types = structure.typeByLocation;
  const locations = getLocationsForConfig(configuration);
  const defaultType = mapDonorStructureType(structure.type);
  const defaultTonnage = Math.max(10, Math.ceil(tonnage));
  let weight = 0;
  for (const [native, alias, fraction] of STRUCTURE_SECTIONS) {
    const location = locations.includes(MechLocation[native])
      ? native
      : alias && locations.includes(MechLocation[alias])
        ? alias
        : undefined;
    if (location === undefined) continue;
    const key = types[location] !== undefined ? location : native;
    const declared = types[key];
    const donorType =
      declared === undefined ? defaultType : mapDonorStructureType(declared);
    // MtfFile.java:669-691 ignores scalar Hybrid entries, including their tonnages.
    const donorTonnage =
      declared === undefined
        ? defaultTonnage
        : Math.max(10, structure.locationTonnage?.[key] ?? defaultTonnage);
    const fullDonorWeight = nativeFullStructureWeight(
      donorTonnage,
      donorType,
      configuration,
    );
    weight += fullDonorWeight * fraction;
  }
  // TestMek.java:118-139: round each full donor first, and the ordered sum last.
  return ceilToHalfTon(weight);
}

/** Structure.java:65-108; expression order is significant before half-ton ceiling. */
function nativeFullStructureWeight(
  tonnage: number,
  type: InternalStructureType,
  configuration: MechConfiguration,
): number {
  const superheavy = tonnage > 100;
  const multiplier = configuration === MechConfiguration.TRIPOD ? 1.1 : 1;
  let weight: number;
  switch (type) {
    case InternalStructureType.ENDO_STEEL_IS:
    case InternalStructureType.ENDO_STEEL_CLAN:
      weight = tonnage / (superheavy ? 10 : 20);
      break;
    case InternalStructureType.REINFORCED:
      weight = tonnage / 5;
      break;
    case InternalStructureType.COMPOSITE:
      weight = tonnage / 20;
      break;
    case InternalStructureType.INDUSTRIAL:
      weight = tonnage / (superheavy ? 2.5 : 5);
      break;
    case InternalStructureType.ENDO_COMPOSITE:
      weight = (tonnage / 10) * (superheavy ? 1.5 : 0.75);
      break;
    default:
      weight = tonnage / (superheavy ? 5 : 10);
  }
  return ceilToHalfTon(weight * multiplier);
}
