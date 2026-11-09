import {
  getInternalStructureDefinition,
  InternalStructureType,
} from '@/types/construction/InternalStructureType';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

/** BattleMech structure mass; callers retain their own admission checks.
 * @spec openspec/specs/internal-structure-system/spec.md
 */
export function calculateStructureWeight(
  tonnage: number,
  structureType: InternalStructureType,
): number {
  const definition =
    getInternalStructureDefinition(structureType) ??
    getInternalStructureDefinition(InternalStructureType.STANDARD);
  if (!definition) throw new Error('Standard structure definition is required');
  return ceilToHalfTon(tonnage * definition.weightMultiplier);
}
