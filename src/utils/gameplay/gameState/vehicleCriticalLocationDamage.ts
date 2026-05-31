import type {
  ICriticalHitResolvedPayload,
  IComponentDamageState,
  IVehicleCriticalLocationDamageState,
} from '@/types/gameplay';

export function applyVehicleCriticalLocationDamage(
  damage: IComponentDamageState,
  payload: ICriticalHitResolvedPayload,
): IComponentDamageState {
  const existing = damage.vehicleCriticalsByLocation?.[payload.location] ?? {};
  const next = vehicleCriticalLocationDamage(existing, payload);
  if (next === existing) {
    return damage;
  }

  return {
    ...damage,
    vehicleCriticalsByLocation: {
      ...damage.vehicleCriticalsByLocation,
      [payload.location]: next,
    },
  };
}

function vehicleCriticalLocationDamage(
  existing: IVehicleCriticalLocationDamageState,
  payload: ICriticalHitResolvedPayload,
): IVehicleCriticalLocationDamageState {
  switch (payload.effect) {
    case 'weapon_destroyed':
      return {
        ...existing,
        weaponsDestroyed: (existing.weaponsDestroyed ?? 0) + 1,
      };
    case 'weapon_jammed':
      return {
        ...existing,
        weaponsJammed: (existing.weaponsJammed ?? 0) + 1,
      };
    case 'stabilizer_hit':
      return { ...existing, stabilizerHit: true };
    case 'flight_stabilizer':
      return { ...existing, flightStabilizerHit: true };
    default:
      return existing;
  }
}
