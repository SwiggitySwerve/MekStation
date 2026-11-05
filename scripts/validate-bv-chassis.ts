import type { ISerializedUnit } from '../src/types/unit/UnitSerialization';

import { CLAN_CHASSIS_MIXED_UNITS } from './validate-bv-known-units';

/** Shared CASE/Blue Shield chassis identity; legacy names cover older inputs. */
export function hasClanChassis(
  unit: Pick<ISerializedUnit, 'techBase' | 'componentTechBases'>,
  unitId?: string,
): boolean {
  return (
    unit.techBase === 'CLAN' ||
    (unit.techBase === 'MIXED' &&
      unitId !== undefined &&
      CLAN_CHASSIS_MIXED_UNITS.has(unitId))
  );
}
