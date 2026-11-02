/** Mounted-equipment resolution and grouping for vehicle construction. */
import type { IEquipmentItem } from '@/types/equipment';
import type {
  IVehicleMountedEquipment,
  ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';

import { computeTurretEquipmentWeight } from './equipmentMounts';
import { isPowerAmplifierEnergyWeapon } from './powerAmplifier';
import { computeTurretWeight } from './turret';

export type EquipmentResolver = (
  equipmentId: string,
) => IEquipmentItem | undefined;

export interface VehicleMountedWeightState {
  equipment: readonly IVehicleMountedEquipment[];
  turret: ITurretConfiguration | null;
  secondaryTurret: ITurretConfiguration | null;
}

/** Resolved figures consumed by the full construction composition. */
export interface VehicleMountedWeightBreakdown {
  equipment: number;
  /** Non-ammunition primary equipment tons (mechanism basis). */
  turretEquipment: number;
  /** Non-ammunition secondary equipment tons (mechanism basis). */
  secondaryTurretEquipment: number;
  /** All primary mounted tons, including ammunition. */
  turretMounted: number;
  /** Qualifying energy-weapon tons for power amplifiers. */
  energyWeapons: number;
  turret: number;
  secondaryTurret: number;
}

export function computeVehicleMountedWeightBreakdown(
  state: VehicleMountedWeightState,
  resolve: EquipmentResolver,
): VehicleMountedWeightBreakdown {
  const mounted = state.equipment.map((e) => {
    const item = resolve(e.equipmentId);
    return {
      weight: item?.weight ?? 0,
      isAmmunition: item?.category === EquipmentCategory.AMMUNITION,
      needsAmplifier: item !== undefined && isPowerAmplifierEnergyWeapon(item),
      inSecondaryTurret: e.location === VehicleLocation.TURRET_2,
      inPrimaryTurret:
        e.isTurretMounted && e.location !== VehicleLocation.TURRET_2,
    };
  });

  const equipment = mounted.reduce((sum, m) => sum + m.weight, 0);
  // Turret structure is 10% of the turret's equipment, ammunition excluded.
  const turretEquipment = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inPrimaryTurret && !m.isAmmunition,
      weight: m.weight,
    })),
  );
  const secondaryTurretEquipment = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inSecondaryTurret && !m.isAmmunition,
      weight: m.weight,
    })),
  );
  const turretMounted = computeTurretEquipmentWeight(
    mounted.map((m) => ({
      isTurretMounted: m.inPrimaryTurret,
      weight: m.weight,
    })),
  );
  const energyWeapons = mounted
    .filter((m) => m.needsAmplifier)
    .reduce((sum, m) => sum + m.weight, 0);

  const turret = state.turret
    ? computeTurretWeight(state.turret.type, turretEquipment)
    : 0;
  const secondaryTurret = state.secondaryTurret
    ? computeTurretWeight(state.secondaryTurret.type, secondaryTurretEquipment)
    : 0;
  return {
    equipment,
    turretEquipment,
    secondaryTurretEquipment,
    turretMounted,
    energyWeapons,
    turret,
    secondaryTurret,
  };
}
