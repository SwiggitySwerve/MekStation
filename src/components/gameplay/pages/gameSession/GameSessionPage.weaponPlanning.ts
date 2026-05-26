import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponStatus } from '@/types/gameplay';

function parseWeaponDamage(damage: IWeaponStatus['damage']): number {
  if (typeof damage === 'number') return damage;
  const parsed = Number.parseFloat(damage);
  return Number.isFinite(parsed) ? parsed : 0;
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
    damage: parseWeaponDamage(status.damage),
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
