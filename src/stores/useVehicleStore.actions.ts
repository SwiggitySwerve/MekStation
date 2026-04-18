import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  TurretType,
  ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';
import {
  computePowerAmplifierWeight,
  requiresPowerAmplifiers,
} from '@/utils/construction/vehicle/powerAmplifier';

import {
  getVehicleWeightClass,
  calculateFlankMP,
} from './useVehicleStore.helpers';
import {
  VehicleStore,
  createEmptyVehicleArmorAllocation,
  createEmptyVTOLArmorAllocation,
} from './vehicleState';

export function setEngineRatingLogic(
  state: VehicleStore,
  rating: number,
): Partial<VehicleStore> {
  return {
    engineRating: rating,
    cruiseMP: Math.floor(rating / state.tonnage),
    flankMP: calculateFlankMP(Math.floor(rating / state.tonnage)),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setCruiseMPLogic(
  state: VehicleStore,
  cruiseMP: number,
): Partial<VehicleStore> {
  return {
    cruiseMP,
    flankMP: calculateFlankMP(cruiseMP),
    engineRating: state.tonnage * cruiseMP,
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setTonnageLogic(
  state: VehicleStore,
  tonnage: number,
): Partial<VehicleStore> {
  const newEngineRating = tonnage * state.cruiseMP;
  const clampedRating = Math.max(10, Math.min(400, newEngineRating));

  return {
    tonnage,
    weightClass: getVehicleWeightClass(tonnage),
    engineRating: clampedRating,
    isSuperheavy: tonnage > 100,
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setMotionTypeLogic(
  state: VehicleStore,
  motionType: GroundMotionType,
): Partial<VehicleStore> {
  const isVTOL = motionType === GroundMotionType.VTOL;
  const wasVTOL = state.motionType === GroundMotionType.VTOL;

  let armorAllocation = state.armorAllocation;
  let unitType: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE =
    state.unitType;

  if (isVTOL && !wasVTOL) {
    armorAllocation = createEmptyVTOLArmorAllocation();
    unitType = UnitType.VTOL;
  } else if (!isVTOL && wasVTOL) {
    armorAllocation = createEmptyVehicleArmorAllocation();
    unitType = UnitType.VEHICLE;
  }

  return {
    motionType,
    unitType,
    armorAllocation,
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function updateEquipmentLocationLogic(
  state: VehicleStore,
  instanceId: string,
  location: VehicleLocation | VTOLLocation,
  isTurretMounted?: boolean,
): Partial<VehicleStore> {
  return {
    equipment: state.equipment.map((e) =>
      e.id === instanceId
        ? {
            ...e,
            location,
            isTurretMounted: isTurretMounted ?? e.isTurretMounted,
          }
        : e,
    ),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function clearAllArmorLogic(state: VehicleStore): Partial<VehicleStore> {
  return {
    armorAllocation:
      state.motionType === GroundMotionType.VTOL
        ? createEmptyVTOLArmorAllocation()
        : createEmptyVehicleArmorAllocation(),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setLocationArmorLogic(
  state: VehicleStore,
  location: string,
  points: number,
): Partial<VehicleStore> {
  return {
    armorAllocation: {
      ...state.armorAllocation,
      [location]: Math.max(0, points),
    },
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setTurretWeightLogic(
  state: VehicleStore,
  weight: number,
): Partial<VehicleStore> | VehicleStore {
  if (!state.turret) return state;

  return {
    turret: {
      ...state.turret,
      currentWeight: weight,
    },
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setTurretTypeLogic(
  state: VehicleStore,
  type: TurretType,
): Partial<VehicleStore> {
  if (type === TurretType.NONE) {
    return {
      turret: null,
      isModified: true,
      lastModifiedAt: Date.now(),
    };
  }

  const turret: ITurretConfiguration = state.turret
    ? { ...state.turret, type }
    : {
        type,
        maxWeight: state.tonnage * 0.1,
        currentWeight: 0,
        rotationArc: 360,
      };

  return {
    turret,
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function autoAllocateArmorLogic(
  state: VehicleStore,
): Partial<VehicleStore> {
  const pointsPerTon = 16;
  const totalPoints = Math.floor(state.armorTonnage * pointsPerTon);
  const hasTurret = state.turret !== null;
  const isVTOL = state.motionType === GroundMotionType.VTOL;

  const frontPercent = 0.35;
  const sidePercent = 0.2;
  const rearPercent = 0.15;
  const turretPercent = hasTurret ? 0.1 : 0;
  const rotorPercent = isVTOL ? 0.02 : 0;

  const normalizer =
    frontPercent + sidePercent * 2 + rearPercent + turretPercent + rotorPercent;

  const newAllocation = {
    [VehicleLocation.FRONT]: Math.floor(
      (totalPoints * frontPercent) / normalizer,
    ),
    [VehicleLocation.LEFT]: Math.floor(
      (totalPoints * sidePercent) / normalizer,
    ),
    [VehicleLocation.RIGHT]: Math.floor(
      (totalPoints * sidePercent) / normalizer,
    ),
    [VehicleLocation.REAR]: Math.floor(
      (totalPoints * rearPercent) / normalizer,
    ),
    [VehicleLocation.TURRET]: hasTurret
      ? Math.floor((totalPoints * turretPercent) / normalizer)
      : 0,
    [VehicleLocation.BODY]: 0,
    ...(isVTOL && {
      [VTOLLocation.ROTOR]: Math.floor(
        (totalPoints * rotorPercent) / normalizer,
      ),
    }),
  };

  return {
    armorAllocation: newAllocation,
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

/**
 * Recompute powerAmpWeight from the currently mounted equipment.
 *
 * Accepts the resolved catalog items so the store doesn't need direct
 * access to the equipment database. The caller (UI or action dispatcher)
 * resolves each mounted equipmentId to its full IEquipmentItem before
 * invoking this logic.  If resolvedItems is omitted powerAmpWeight resets to 0.
 */
export function derivePowerAmpWeightLogic(
  state: VehicleStore,
  resolvedItems?: IEquipmentItem[],
): Partial<VehicleStore> {
  if (!requiresPowerAmplifiers(state.engineType) || !resolvedItems) {
    // Fusion engines need no power amps; also reset when items unavailable
    return {
      powerAmpWeight: 0,
      isModified: true,
      lastModifiedAt: Date.now(),
    };
  }

  // Build a set of mounted equipmentIds for quick lookup
  const mountedIds = new Set(state.equipment.map((e) => e.equipmentId));

  // Sum weights of energy weapons that are actually mounted on this vehicle
  const totalEnergyWeight = resolvedItems
    .filter(
      (item) =>
        mountedIds.has(item.id) &&
        item.category === EquipmentCategory.ENERGY_WEAPON,
    )
    .reduce((sum, item) => sum + item.weight, 0);

  return {
    powerAmpWeight: computePowerAmplifierWeight(totalEnergyWeight),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}
