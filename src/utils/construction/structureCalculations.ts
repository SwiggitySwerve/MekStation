import type { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import type { ISerializedStructure } from '@/types/unit/UnitSerialization';

import {
  getInternalStructureDefinition,
  InternalStructureType,
} from '@/types/construction/InternalStructureType';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

/** Optional source facts carried by configuration-aware structure callers. */
export interface IStructureWeightContext {
  readonly configuration?: MechConfiguration;
  readonly frankenStructure?: ISerializedStructure;
}

/** BattleMech structure mass; callers retain their own admission checks.
 * @spec openspec/specs/internal-structure-system/spec.md
 */
export function calculateStructureWeight(
  tonnage: number,
  structureType: InternalStructureType,
  _context?: IStructureWeightContext,
): number {
  const definition =
    getInternalStructureDefinition(structureType) ??
    getInternalStructureDefinition(InternalStructureType.STANDARD);
  if (!definition) throw new Error('Standard structure definition is required');
  return ceilToHalfTon(tonnage * definition.weightMultiplier);
}
