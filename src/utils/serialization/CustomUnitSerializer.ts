import type { AerospaceState } from '@/stores/aerospaceState';
import type { UnitState } from '@/stores/unitState';
import type { VehicleState } from '@/stores/vehicleState';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { Era } from '@/types/temporal/Era';
import type {
  ISerializedArmor,
  ISerializedEquipment,
  ISerializedUnit,
} from '@/types/unit/UnitSerialization';

import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import {
  blkEngineName,
  encodeBlkEngine,
} from '@/services/conversion/blkEngineIdentity';
import { serializeVehicleTurretContext } from '@/services/conversion/vehicleTurretContext';
import { aerospaceContractArc } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { getCriticalSlotsForLocation } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import { getCockpitSourceTag } from '@/types/construction/CockpitType';
import {
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType, NO_GYRO_SOURCE_TAG } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import {
  TechBaseMode,
  serializeComponentTechBases,
  serializeTechBaseMode,
} from '@/types/construction/TechBaseConfiguration';
import {
  VehicleLocation,
  VTOLLocation,
  SuperHeavyVehicleLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract, type IUnitContract } from '@/types/contracts';
import { CURRENT_UNIT_SCHEMA_VERSION } from '@/types/contracts/generated/unit.zod';
import { RULES_LEVEL_TAGS as RULES_LEVEL } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { aerospaceEditorSchema } from '@/types/unit/AerospaceSerialization';
import { vehicleEditorSchema } from '@/types/unit/VehicleSerialization';
import { isAmmunitionEquipmentId } from '@/utils/construction/equipmentBV/catalogLoader';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { getSlotParts } from '@/utils/construction/slotOperations/parts';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

import { isRearLoc } from '../../../scripts/validate-bv-normalizers';
import { aerospaceSupportSaveFields } from './CustomUnitSerializer.aerospace';
import { crewSeatSaveFields } from './CustomUnitSerializer.crew';
import { ARMOR_TYPE, ENGINE_TYPE } from './CustomUnitSerializer.tags';
import { cloneSerializedStructure } from './structureMetadata';

const GYRO_TYPE = {
  [GyroType.STANDARD]: 'STANDARD',
  [GyroType.XL]: 'XL',
  [GyroType.COMPACT]: 'COMPACT',
  [GyroType.HEAVY_DUTY]: 'HEAVY_DUTY',
  [GyroType.SUPERHEAVY]: 'SUPERHEAVY',
  [GyroType.NONE]: NO_GYRO_SOURCE_TAG,
} as const satisfies Readonly<Record<GyroType, string>>;

const STRUCTURE_TYPE = {
  [InternalStructureType.STANDARD]: 'STANDARD',
  [InternalStructureType.ENDO_STEEL_IS]: 'ENDO_STEEL',
  [InternalStructureType.ENDO_STEEL_CLAN]: 'ENDO_STEEL_CLAN',
  [InternalStructureType.ENDO_COMPOSITE]: 'ENDO_COMPOSITE',
  [InternalStructureType.REINFORCED]: 'REINFORCED',
  [InternalStructureType.COMPOSITE]: 'COMPOSITE',
  [InternalStructureType.INDUSTRIAL]: 'INDUSTRIAL',
} as const satisfies Readonly<Record<InternalStructureType, string>>;

const HEAT_SINK_TYPE = {
  [HeatSinkType.SINGLE]: 'SINGLE',
  [HeatSinkType.DOUBLE_IS]: 'DOUBLE',
  [HeatSinkType.DOUBLE_CLAN]: 'DOUBLE_CLAN',
  [HeatSinkType.COMPACT]: 'COMPACT',
  [HeatSinkType.LASER]: 'LASER',
} as const satisfies Readonly<Record<HeatSinkType, string>>;

const JUMP_JET_TYPE = {
  [JumpJetType.STANDARD]: 'STANDARD',
  [JumpJetType.IMPROVED]: 'IMPROVED',
  [JumpJetType.MECHANICAL]: 'MECHANICAL',
} as const satisfies Readonly<Record<JumpJetType, string>>;

export type CustomUnitSaveIdentity = {
  readonly id: string;
  readonly chassis: string;
  readonly variant: string;
  readonly era: Era;
};

function serializeArmor(state: UnitState): ISerializedArmor {
  const allocation: ISerializedArmor['allocation'] = {};
  const rearArmor: Readonly<Partial<Record<string, number>>> = {
    [MechLocation.CENTER_TORSO]: state.armorAllocation.centerTorsoRear,
    [MechLocation.LEFT_TORSO]: state.armorAllocation.leftTorsoRear,
    [MechLocation.RIGHT_TORSO]: state.armorAllocation.rightTorsoRear,
  };
  const rearArmorKeys = new Set([
    'centerTorsoRear',
    'leftTorsoRear',
    'rightTorsoRear',
  ]);

  for (const [location, front] of Object.entries(state.armorAllocation)) {
    if (rearArmorKeys.has(location)) {
      continue;
    }
    const rear = rearArmor[location];
    allocation[location] = rear === undefined ? front : { front, rear };
  }

  return {
    type: ARMOR_TYPE[state.armorType],
    allocation,
  };
}

function serializeEquipment(
  equipment: readonly IMountedEquipmentInstance[],
): ISerializedEquipment[] {
  return equipment.map((item) => {
    const isAmmo = item.category === EquipmentCategory.AMMUNITION;
    return {
      id: item.equipmentId,
      // Use the existing resolution owner's category evidence; unambiguous
      // portable records retain their literal shape without a new marker.
      ...(isAmmo !== isAmmunitionEquipmentId(item.equipmentId)
        ? { isAmmo }
        : {}),
      location: item.location ?? 'Unallocated',
      // Split mounts are reconstructed from the complete critical grid on reopen.
      ...(item.slots && !item.splitSlots ? { slots: [...item.slots] } : {}),
      isRearMounted: item.isRearMounted,
      isRemovable: item.isRemovable,
      isOmniPodMounted: item.isOmniPodMounted,
      ...(item.linkedAmmoId ? { linkedAmmo: item.linkedAmmoId } : {}),
    };
  });
}

function serializeCriticalSlots(state: UnitState, walk: number) {
  // Reuse the source-aware projection: editor mounts alone cannot represent
  // original critical-grid details such as the Atlas's rear laser markers.
  const projected = state.bvContext
    ? buildEditableMechBVInput(projectEditableMech(state, walk)).criticalSlots
    : undefined;
  const result: Record<string, (string | null)[]> = {};
  const locations = getLocationsForConfig(state.configuration);
  for (const location of [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM]) {
    if (!locations.includes(location)) continue;
    const slots: (string | null)[] = Array.from(
      { length: LOCATION_SLOT_COUNTS[location] },
      () => null,
    );
    getFixedSlotNames(
      location,
      state.engineType,
      state.gyroType,
      state.armActuators,
    ).forEach((name, index) => {
      slots[index] = name;
    });
    result[location] = slots;
  }

  for (const item of state.equipment) {
    if (!item.location || !item.slots) continue;
    for (const { location, slots } of getSlotParts(item)) {
      const sourceSlots = getCriticalSlotsForLocation(projected, location);
      const locationSlots =
        result[location] ??
        Array.from({ length: LOCATION_SLOT_COUNTS[location] }, () => null);
      for (const slot of slots) {
        if (slot >= 0 && slot < locationSlots.length) {
          locationSlots[slot] =
            item.name + (isRearLoc(sourceSlots?.[slot] ?? '') ? ' (R)' : '');
        }
      }
      result[location] = locationSlots;
    }
  }

  return result;
}

export function serializeCustomUnitState(
  state: UnitState,
  identity: CustomUnitSaveIdentity,
): ISerializedUnit & {
  readonly schemaVersion: string;
  readonly lamType?: string;
} {
  const walk =
    state.tonnage > 0 ? Math.floor(state.engineRating / state.tonnage) : 0;
  const numericMulId = Number(state.mulId);
  const mulId =
    Number.isSafeInteger(numericMulId) && String(numericMulId) === state.mulId
      ? numericMulId
      : state.mulId;

  return {
    schemaVersion: CURRENT_UNIT_SCHEMA_VERSION,
    id: identity.id,
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    unitType: state.unitType,
    configuration: state.configuration,
    lamType: state.lamType,
    techBase: serializeTechBaseMode(state.techBaseMode),
    rulesLevel: RULES_LEVEL[state.rulesLevel],
    era: identity.era,
    year: state.year,
    tonnage: state.tonnage,
    mulId,
    sourceDefinition: state.sourceDefinition,
    role: state.role || undefined,
    fluff: state.fluff,
    engine: {
      type: ENGINE_TYPE[state.engineType],
      rating: state.engineRating,
    },
    gyro: { type: GYRO_TYPE[state.gyroType] },
    cockpit: getCockpitSourceTag(state.cockpitType),
    structure: cloneSerializedStructure(state.frankenStructure) ?? {
      type: STRUCTURE_TYPE[state.internalStructureType],
    },
    armor: serializeArmor(state),
    heatSinks: {
      type: HEAT_SINK_TYPE[state.heatSinkType],
      count: state.heatSinkCount,
    },
    movement: {
      walk,
      jump: state.jumpMP,
      jumpJetType: JUMP_JET_TYPE[state.jumpJetType],
      enhancements: state.enhancement ? [state.enhancement] : [],
    },
    equipment: serializeEquipment(state.equipment),
    criticalSlots: serializeCriticalSlots(state, walk),
    isOmni: state.isOmni,
    baseChassisHeatSinks: state.baseChassisHeatSinks,
    clanName: state.clanName || undefined,
    componentTechBases:
      state.techBaseMode === TechBaseMode.MIXED
        ? serializeComponentTechBases(state.componentTechBases)
        : undefined,
    ...crewSeatSaveFields(state),
  };
}

/** Vehicle store -> catalog contract; editor-only facts use a validated extension. */
export function serializeCustomVehicleState(
  state: VehicleState,
  identity: CustomUnitSaveIdentity,
): IUnitContract & {
  family: 'vehicles';
  vehicleEditor: ReturnType<typeof vehicleEditorSchema.parse>;
} {
  const locations = {
    ...VehicleLocation,
    ...VTOLLocation,
    ...SuperHeavyVehicleLocation,
  };
  const locationTag = (location: string) => {
    const key = Object.entries(locations).find(
      ([, value]) => value === location,
    )?.[0];
    if (!key) throw new TypeError(`Unknown vehicle location: ${location}`);
    return key;
  };
  const vehicleEditor = vehicleEditorSchema.parse({
    ...state,
    name: [identity.chassis, identity.variant].filter(Boolean).join(' '),
    mounts: state.equipment,
  });
  const definition = UnitContract.parse({
    schemaVersion: CURRENT_UNIT_SCHEMA_VERSION,
    id: identity.id,
    family: 'vehicles',
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    era: identity.era,
    unitType: state.unitType,
    year: state.year,
    tonnage: state.tonnage,
    mulId: state.mulId,
    techBase: state.techBase === TechBase.CLAN ? 'CLAN' : 'INNER_SPHERE',
    rulesLevel: RULES_LEVEL[state.rulesLevel],
    motionType: state.motionType,
    engine: {
      type: blkEngineName(Number(encodeBlkEngine(state.engineType))),
      rating: state.engineRating,
    },
    clanEngine: state.engineType === EngineType.XL_CLAN,
    engineTechRating: state.engineTechRating,
    structuralTechRating: state.structuralTechRating,
    ...(state.armorTechRating === undefined
      ? {}
      : { armorTechRating: state.armorTechRating }),
    movement: { cruiseMP: state.cruiseMP, flankMP: state.flankMP },
    armor: {
      type: state.usesBarArmor ? 'BAR' : ARMOR_TYPE[state.armorType],
      ...(state.usesBarArmor ? { barRating: state.barRating } : {}),
      byLocation: Object.fromEntries(
        Object.entries(state.armorAllocation).map(([location, points]) => [
          locationTag(location),
          points,
        ]),
      ),
    },
    ...serializeVehicleTurretContext(state),
    isTrailer: state.isTrailer,
    transporters: state.transporters,
    equipment: state.equipment.map((item) => ({
      id: item.equipmentId,
      name: item.name,
      location: locationTag(item.location),
      isRearMounted: item.isRearMounted,
      isOmniPodMounted: item.isOmniPodMounted,
      linkedAmmo: state.equipment.some(
        (mount) => mount.id === item.linkedAmmoId,
      )
        ? `mount-${state.equipment.findIndex((mount) => mount.id === item.linkedAmmoId)}`
        : item.linkedAmmoId,
    })),
    vehicleEditor,
  });
  return { ...definition, family: 'vehicles' as const, vehicleEditor };
}

/** Aerospace store -> catalog contract, sharing the custom-library save owner. */
export function serializeCustomAerospaceState(
  state: AerospaceState,
  identity: CustomUnitSaveIdentity,
): IUnitContract & {
  family: 'aerospace';
  aerospaceEditor: ReturnType<typeof aerospaceEditorSchema.parse>;
} {
  const support = aerospaceSupportSaveFields(
    state,
    ARMOR_TYPE[state.armorType],
  );
  const smallCraft = state.aerospaceSubType === AerospaceSubType.SMALL_CRAFT;
  const arc = (location: Parameters<typeof aerospaceContractArc>[0]) =>
    aerospaceContractArc(location, smallCraft);
  const aerospaceEditor = aerospaceEditorSchema.parse({
    ...state,
    name: [identity.chassis, identity.variant].filter(Boolean).join(' '),
    bays: state.bays?.map((bay) => ({
      ...bay,
      doors: Number.isNaN(bay.doors) ? null : bay.doors,
    })),
    mounts: state.equipment.map((mount) => {
      const target = state.equipment.findIndex(
        (item) => item.id === mount.linkedAmmoId,
      );
      return {
        ...mount,
        linkedAmmoIndex: target >= 0 ? target : undefined,
        linkedAmmoId: target >= 0 ? undefined : mount.linkedAmmoId,
      };
    }),
  });
  const definition = UnitContract.parse({
    schemaVersion: CURRENT_UNIT_SCHEMA_VERSION,
    id: identity.id,
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    era: identity.era,
    family: 'aerospace',
    unitType: state.unitType,
    subType: state.isFixedWingSupport
      ? 'FixedWingSupport'
      : state.aerospaceSubType,
    year: state.year,
    tonnage: state.tonnage,
    mulId: state.mulId,
    techBase: state.techBase === TechBase.CLAN ? 'CLAN' : 'INNER_SPHERE',
    rulesLevel: RULES_LEVEL[state.rulesLevel],
    motionType: state.motionType.toUpperCase(),
    isOmni: state.isOmni,
    // Legacy small-craft ratings exceed the contract's fighter rating range.
    // Keep the exact editor rating in the validated extension, without clamping.
    engine: { type: ENGINE_TYPE[state.engineType] },
    movement: { safeThrust: state.safeThrust, maxThrust: state.maxThrust },
    ...support.metadata,
    fuel: state.fuelPoints,
    structuralIntegrity: state.structuralIntegrity,
    cockpit: state.cockpitType.toUpperCase().replaceAll(' ', '_'),
    heatSinks: {
      type: state.doubleHeatSinks ? 'DOUBLE' : 'SINGLE',
      count: state.heatSinks,
    },
    armor: {
      ...support.armor,
      byArc: Object.fromEntries(
        Object.entries(state.armorAllocation).map(([location, points]) => [
          arc(location as Parameters<typeof arc>[0]),
          points,
        ]),
      ),
    },
    hasBombBay: state.hasBombBay,
    bombCapacity: state.bombCapacity,
    equipment: state.equipment.map((mount) => ({
      id: mount.equipmentId,
      name: mount.name,
      location: arc(mount.location),
      isRearMounted: mount.isRearMounted,
    })),
    aerospaceEditor,
  });
  return { ...definition, family: 'aerospace' as const, aerospaceEditor };
}

export { serializeCustomSmallUnitState } from './CustomUnitSerializer.smallUnits';
