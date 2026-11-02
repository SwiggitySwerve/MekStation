/**
 * Shared parser for saved custom combat construction.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import {
  projectCustomCombatSnapshot,
  customCombatSnapshotFamily,
  isCustomCombatReference,
  type CustomCombatSnapshot,
} from '@/types/contracts/CustomCombatSnapshot';
import { parseUnitReference } from '@/types/unit/UnitIndex';

export { isCustomCombatReference };

/**
 * Accept supported combat construction whose identity matches the requested
 * custom-* reference. Id mismatch, malformed payloads, and unsupported
 * chassis types return null (callers fail closed).
 */
export function parseCustomCombatDefinition(
  payload: unknown,
  id: string,
): CustomCombatSnapshot | null {
  const reference = parseUnitReference(id);
  if (!isCustomCombatReference(id)) return null;
  const definition = projectCustomCombatSnapshot(payload);
  if (
    !definition ||
    definition.id !== reference.id ||
    (reference.family &&
      reference.family !== customCombatSnapshotFamily(definition))
  ) {
    return null;
  }
  return definition;
}
