import { VehicleOnlyEngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { IEquipmentItem } from '@/types/equipment';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  TurretType,
  ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';
import {
  clampLocationArmor,
  getInstalledArmorAllocation,
} from '@/utils/construction/vehicle/armor';
import { getVehicleArmorProfile } from '@/utils/construction/vehicle/armorLimits';
import { autoAllocateVehicleArmor } from '@/utils/construction/vehicle/editorArmor';
import {
  computeStoredVehicleEngineRating,
  computeCruiseMPFromRating,
} from '@/utils/construction/vehicle/engine';
import {
  computePowerAmplifierWeight,
  isPowerAmplifierEnergyWeapon,
  requiresPowerAmplifiers,
} from '@/utils/construction/vehicle/powerAmplifier';

import {
  getVehicleWeightClass,
  calculateFlankMP,
} from './useVehicleStore.helpers';
import {
  VehicleStore,
  VehicleState,
  createEmptyVehicleArmorAllocation,
  createEmptyVTOLArmorAllocation,
} from './vehicleState';

export function setEngineRatingLogic(
  state: VehicleStore,
  rating: number,
): Partial<VehicleStore> {
  const cruiseMP = computeCruiseMPFromRating(
    state.tonnage,
    rating,
    state.motionType,
    state.unitType === UnitType.SUPPORT_VEHICLE,
  );
  return {
    engineRating: rating,
    cruiseMP,
    flankMP: calculateFlankMP(cruiseMP),
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
    engineRating: computeStoredVehicleEngineRating(
      state.tonnage,
      cruiseMP,
      state.motionType,
      state.unitType === UnitType.SUPPORT_VEHICLE,
      state.engineType === VehicleOnlyEngineType.NONE,
    ),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setTonnageLogic(
  state: VehicleStore,
  tonnage: number,
): Partial<VehicleStore> {
  const engineLess = state.engineType === VehicleOnlyEngineType.NONE;
  const support = state.unitType === UnitType.SUPPORT_VEHICLE;
  const newEngineRating = computeStoredVehicleEngineRating(
    tonnage,
    state.cruiseMP,
    state.motionType,
    support,
    engineLess,
  );
  // Support ratings have no floor or 400 cap (Engine.getRating, Engine.java:601).
  const clampedRating =
    support || (engineLess && newEngineRating === 0)
      ? newEngineRating
      : Math.max(10, Math.min(400, newEngineRating));

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
    engineRating: computeStoredVehicleEngineRating(
      state.tonnage,
      state.cruiseMP,
      motionType,
      state.unitType === UnitType.SUPPORT_VEHICLE,
      state.engineType === VehicleOnlyEngineType.NONE,
    ),
    unitType:
      state.unitType === UnitType.SUPPORT_VEHICLE ? state.unitType : unitType,
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
  const profile = getVehicleArmorProfile(state);
  return {
    armorAllocation: {
      ...state.armorAllocation,
      [location]: clampLocationArmor(
        state.tonnage,
        location,
        points,
        profile.hasTurret,
        profile.isVTOL,
        profile,
      ),
    },
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function setTurretTypeLogic(
  state: Pick<VehicleState, 'turret' | 'tonnage' | 'armorAllocation'>,
  type: TurretType,
): Partial<VehicleStore> {
  if (type === TurretType.NONE) {
    return {
      turret: null,
      secondaryTurret: null,
      armorAllocation: getInstalledArmorAllocation(
        state.armorAllocation,
        false,
        false,
      ),
      isModified: true,
      lastModifiedAt: Date.now(),
    };
  }

  const turret: ITurretConfiguration = state.turret
    ? { type, rotationArc: state.turret.rotationArc }
    : {
        type,

        rotationArc: 360,
      };

  return {
    turret,
    // Reinstalling a location starts at zero; edits retain installed armor.
    armorAllocation: state.turret
      ? state.armorAllocation
      : getInstalledArmorAllocation(state.armorAllocation, false, true),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

/**
 * Toggle the secondary turret on/off.
 *
 * Enabling initializes a default secondary turret configuration if none exists.
 * Disabling nulls the configuration AND zeros TURRET_2 armor so the next enable
 * starts from a clean state.
 */
export function setHasSecondaryTurretLogic(
  state: VehicleStore,
  enabled: boolean,
): Partial<VehicleStore> {
  if (!enabled) {
    // Zero TURRET_2 armor while preserving the rest of the allocation.
    const nextAllocation = getInstalledArmorAllocation(
      state.armorAllocation,
      true,
      false,
    );
    return {
      secondaryTurret: null,
      armorAllocation: nextAllocation,
      isModified: true,
      lastModifiedAt: Date.now(),
    };
  }

  // Already enabled — no-op (idempotent).
  if (state.secondaryTurret) return {};

  const secondaryTurret: ITurretConfiguration = {
    type: TurretType.SINGLE,

    rotationArc: 360,
  };
  return {
    secondaryTurret,
    armorAllocation: getInstalledArmorAllocation(
      state.armorAllocation,
      true,
      false,
    ),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

/**
 * Set the secondary turret type. No-op when the secondary turret is off
 * (callers must call setHasSecondaryTurret(true) first).
 */
export function setSecondaryTurretTypeLogic(
  state: VehicleStore,
  type: TurretType,
): Partial<VehicleStore> {
  if (!state.secondaryTurret) return {};
  if (type === TurretType.NONE) {
    // Treat NONE as "disable secondary turret" for parity with primary path.
    return setHasSecondaryTurretLogic(state, false);
  }
  return {
    secondaryTurret: { type, rotationArc: state.secondaryTurret.rotationArc },
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}

export function autoAllocateArmorLogic(
  state: VehicleStore,
): Partial<VehicleStore> {
  const profile = getVehicleArmorProfile(state);
  const newAllocation = {
    ...(profile.isVTOL
      ? createEmptyVTOLArmorAllocation()
      : createEmptyVehicleArmorAllocation()),
    ...autoAllocateVehicleArmor({ ...state, profile }),
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
      (item) => mountedIds.has(item.id) && isPowerAmplifierEnergyWeapon(item),
    )
    .reduce((sum, item) => sum + item.weight, 0);

  return {
    powerAmpWeight: computePowerAmplifierWeight(totalEnergyWeight),
    isModified: true,
    lastModifiedAt: Date.now(),
  };
}
