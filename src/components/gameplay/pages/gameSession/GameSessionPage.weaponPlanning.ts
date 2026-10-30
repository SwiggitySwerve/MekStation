import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponStatus } from '@/types/gameplay';

import { missileRackSize } from '@/utils/gameplay/clusterWeapons';

/**
 * Planning weapons carry the launcher total (as hydration does), so an
 * `"N/missile"` display string is multiplied by the rack the shared owner reads.
 */
function parseWeaponDamage(status: IWeaponStatus): number {
  const { damage } = status;
  if (typeof damage === 'number') return damage;
  const parsed = Number.parseFloat(damage);
  if (!Number.isFinite(parsed)) return 0;
  if (!/\/missile/i.test(damage)) return parsed;
  return parsed * (missileRackSize(status.id, status.name) ?? 1);
}

function inferAmmoPerTon(status: IWeaponStatus): number {
  if (status.ammoMax !== undefined) return status.ammoMax;
  if (status.ammoRemaining !== undefined) {
    return Math.max(1, status.ammoRemaining);
  }
  return -1;
}

export function weaponStatusToPlanningWeapon(status: IWeaponStatus): IWeapon {
  return {
    id: status.id,
    name: status.name,
    shortRange: status.ranges.short,
    mediumRange: status.ranges.medium,
    longRange: status.ranges.long,
    damage: parseWeaponDamage(status),
    heat: status.heat,
    minRange: status.ranges.minimum ?? 0,
    location: status.location,
    ammoPerTon: inferAmmoPerTon(status),
    destroyed: status.destroyed || Boolean(status.jammed),
    mountingArc: status.mountingArc,
    mountingArcs: status.mountingArcs,
    vehicleMountLocation: status.vehicleMountLocation,
    vehicleIsTurretMounted: status.vehicleIsTurretMounted,
  };
}

export function planningWeaponsForSelectedUnit({
  selectedUnitId,
  unitWeapons,
}: {
  readonly selectedUnitId: string | null;
  readonly unitWeapons: Readonly<Record<string, readonly IWeaponStatus[]>>;
}): readonly IWeapon[] {
  if (!selectedUnitId) return [];
  return (unitWeapons[selectedUnitId] ?? []).map(weaponStatusToPlanningWeapon);
}
