import type { ISerializedUnit } from '../src/types/unit/UnitSerialization';

import { CLAN_CHASSIS_MIXED_UNITS } from './validate-bv-known-units';

/** Shared CASE/Blue Shield chassis identity; legacy names cover older inputs. */
export function hasClanChassis(
  unit: Pick<ISerializedUnit, 'techBase' | 'componentTechBases'>,
  unitId?: string,
): boolean {
  if (unit.techBase !== 'MIXED') return unit.techBase === 'CLAN';
  const explicit = unit.componentTechBases?.chassis;
  if (explicit !== undefined) return explicit === 'CLAN';
  return unitId !== undefined && CLAN_CHASSIS_MIXED_UNITS.has(unitId);
}
