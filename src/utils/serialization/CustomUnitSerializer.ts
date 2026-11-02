import type { AerospaceState } from '@/stores/aerospaceState';
import type { BattleArmorState } from '@/stores/battleArmorState';
import type { ProtoMechState } from '@/stores/protoMechState';
import type { UnitState } from '@/stores/unitState';
import type { VehicleState } from '@/stores/vehicleState';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { Era } from '@/types/temporal/Era';
import type {
  ISerializedArmor,
  ISerializedCriticalSlots,
  ISerializedEquipment,
  ISerializedUnit,
} from '@/types/unit/UnitSerialization';

import {
  blkEngineName,
  encodeBlkEngine,
} from '@/services/conversion/blkEngineIdentity';
import { aerospaceContractArc } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import {
  mapProtoMechDefinitionToState,
  mapBattleArmorDefinitionToState,
  PROTO_ARMOR_CODES,
} from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import { vehicleEditorSchema } from '@/services/units/unitLoaderService/vehicleMapping';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import {
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { getLocationsForConfig } from '@/types/construction/MechConfigurationSystem';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import {
  VehicleLocation,
  ProtoMechLocation,
  BattleArmorLocation,
  VTOLLocation,
  SuperHeavyVehicleLocation,
} from '@/types/construction/UnitLocation';
import { UnitContract, type IUnitContract } from '@/types/contracts';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { aerospaceEditorSchema } from '@/types/unit/AerospaceSerialization';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { BattleArmorWeightClass } from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import {
  battleArmorEditorSchema,
  protoMechEditorSchema,
} from '@/types/unit/SmallUnitSerialization';
import { battleArmorContractArmorType } from '@/utils/construction/battlearmor/battleArmorBVAdapter';
import { JumpJetType } from '@/utils/construction/movementCalculations';
import { getFixedSlotNames } from '@/utils/construction/slotOperations/topology';

const ENGINE_TYPE = {
  [EngineType.STANDARD]: 'FUSION',
  [EngineType.XL_IS]: 'XL',
  [EngineType.XL_CLAN]: 'CLAN_XL',
  [EngineType.LIGHT]: 'LIGHT',
  [EngineType.XXL]: 'XXL',
  [EngineType.COMPACT]: 'COMPACT',
  [EngineType.ICE]: 'ICE',
  [EngineType.FUEL_CELL]: 'FUEL_CELL',
  [EngineType.FISSION]: 'FISSION',
} as const satisfies Readonly<Record<EngineType, string>>;

const GYRO_TYPE = {
  [GyroType.STANDARD]: 'STANDARD',
  [GyroType.XL]: 'XL',
  [GyroType.COMPACT]: 'COMPACT',
  [GyroType.HEAVY_DUTY]: 'HEAVY_DUTY',
  [GyroType.SUPERHEAVY]: 'SUPERHEAVY',
} as const satisfies Readonly<Record<GyroType, string>>;

const COCKPIT_TYPE = {
  [CockpitType.STANDARD]: 'STANDARD',
  [CockpitType.SMALL]: 'SMALL',
  [CockpitType.COMMAND_CONSOLE]: 'COMMAND_CONSOLE',
  [CockpitType.TORSO_MOUNTED]: 'TORSO_MOUNTED',
  [CockpitType.PRIMITIVE]: 'PRIMITIVE',
  [CockpitType.INDUSTRIAL]: 'INDUSTRIAL',
  [CockpitType.SUPER_HEAVY]: 'SUPERHEAVY',
} as const satisfies Readonly<Record<CockpitType, string>>;

const STRUCTURE_TYPE = {
  [InternalStructureType.STANDARD]: 'STANDARD',
  [InternalStructureType.ENDO_STEEL_IS]: 'ENDO_STEEL',
  [InternalStructureType.ENDO_STEEL_CLAN]: 'ENDO_STEEL_CLAN',
  [InternalStructureType.ENDO_COMPOSITE]: 'ENDO_COMPOSITE',
  [InternalStructureType.REINFORCED]: 'REINFORCED',
  [InternalStructureType.COMPOSITE]: 'COMPOSITE',
  [InternalStructureType.INDUSTRIAL]: 'INDUSTRIAL',
} as const satisfies Readonly<Record<InternalStructureType, string>>;

const ARMOR_TYPE = {
  [ArmorTypeEnum.STANDARD]: 'STANDARD',
  [ArmorTypeEnum.FERRO_FIBROUS_IS]: 'FERRO_FIBROUS',
  [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: 'FERRO_FIBROUS_CLAN',
  [ArmorTypeEnum.LIGHT_FERRO]: 'LIGHT_FERRO_FIBROUS',
  [ArmorTypeEnum.HEAVY_FERRO]: 'HEAVY_FERRO_FIBROUS',
  [ArmorTypeEnum.STEALTH]: 'STEALTH',
  [ArmorTypeEnum.REACTIVE]: 'REACTIVE',
  [ArmorTypeEnum.REFLECTIVE]: 'REFLECTIVE',
  [ArmorTypeEnum.HARDENED]: 'HARDENED',
  [ArmorTypeEnum.FERRO_LAMELLOR]: 'FERRO_LAMELLOR',
  [ArmorTypeEnum.BALLISTIC_REINFORCED]: 'BALLISTIC_REINFORCED',
} as const satisfies Readonly<Record<ArmorTypeEnum, string>>;

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

const TECH_BASE = {
  [TechBaseMode.INNER_SPHERE]: 'INNER_SPHERE',
  [TechBaseMode.CLAN]: 'CLAN',
  [TechBaseMode.MIXED]: 'MIXED',
} as const satisfies Readonly<Record<TechBaseMode, string>>;

const RULES_LEVEL = {
  [RulesLevel.INTRODUCTORY]: 'INTRODUCTORY',
  [RulesLevel.STANDARD]: 'STANDARD',
  [RulesLevel.ADVANCED]: 'ADVANCED',
  [RulesLevel.EXPERIMENTAL]: 'EXPERIMENTAL',
} as const satisfies Readonly<Record<RulesLevel, string>>;

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
  return equipment.map((item) => ({
    id: item.equipmentId,
    location: item.location ?? 'Unallocated',
    ...(item.slots ? { slots: [...item.slots] } : {}),
    isRearMounted: item.isRearMounted,
    isRemovable: item.isRemovable,
    isOmniPodMounted: item.isOmniPodMounted,
    ...(item.linkedAmmoId ? { linkedAmmo: item.linkedAmmoId } : {}),
  }));
}

function serializeCriticalSlots(state: UnitState): ISerializedCriticalSlots {
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
    if (!item.location || !item.slots) {
      continue;
    }

    const locationSlots =
      result[item.location] ??
      Array.from({ length: LOCATION_SLOT_COUNTS[item.location] }, () => null);
    for (const slot of item.slots) {
      if (slot >= 0 && slot < locationSlots.length) {
        locationSlots[slot] = item.name;
      }
    }
    result[item.location] = locationSlots;
  }

  return result;
}

export function serializeCustomUnitState(
  state: UnitState,
  identity: CustomUnitSaveIdentity,
): ISerializedUnit {
  const walk =
    state.tonnage > 0 ? Math.floor(state.engineRating / state.tonnage) : 0;
  const numericMulId = Number(state.mulId);
  const mulId =
    Number.isSafeInteger(numericMulId) && String(numericMulId) === state.mulId
      ? numericMulId
      : state.mulId;

  return {
    id: identity.id,
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    unitType: state.unitType,
    configuration: state.configuration,
    techBase: TECH_BASE[state.techBaseMode],
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
    cockpit: COCKPIT_TYPE[state.cockpitType],
    structure: { type: STRUCTURE_TYPE[state.internalStructureType] },
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
    criticalSlots: serializeCriticalSlots(state),
    isOmni: state.isOmni,
    baseChassisHeatSinks: state.baseChassisHeatSinks,
    clanName: state.clanName || undefined,
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
    movement: { cruiseMP: state.cruiseMP, flankMP: state.flankMP },
    armor: {
      type: ARMOR_TYPE[state.armorType],
      byLocation: Object.fromEntries(
        Object.entries(state.armorAllocation).map(([location, points]) => [
          locationTag(location),
          points,
        ]),
      ),
    },
    isOmni: state.isOmni,
    isTrailer: state.isTrailer,
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
  const arc = (location: Parameters<typeof aerospaceContractArc>[0]) =>
    aerospaceContractArc(
      location,
      state.aerospaceSubType === AerospaceSubType.SMALL_CRAFT,
    );
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
    fuel: state.fuelPoints,
    structuralIntegrity: state.structuralIntegrity,
    cockpit: state.cockpitType.toUpperCase().replaceAll(' ', '_'),
    heatSinks: {
      type: state.doubleHeatSinks ? 'DOUBLE' : 'SINGLE',
      count: state.heatSinks,
    },
    armor: {
      type: ARMOR_TYPE[state.armorType],
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

/** Small-unit store -> contract, retaining source declarations and exact editor facts. */
export function serializeCustomSmallUnitState(
  state: ProtoMechState | BattleArmorState,
  identity: CustomUnitSaveIdentity,
) {
  const family =
    state.unitType === UnitType.PROTOMECH ? 'protomechs' : 'battlearmor';
  const source = state.librarySource;
  const smallUnitEditor = (
    state.unitType === UnitType.PROTOMECH
      ? protoMechEditorSchema
      : battleArmorEditorSchema
  ).parse({
    ...state,
    chassis: identity.chassis,
    model: identity.variant,
    name: [identity.chassis, identity.variant].filter(Boolean).join(' '),
  });
  const location = (value: string) => {
    const tag = Object.entries({
      ...ProtoMechLocation,
      ...BattleArmorLocation,
    }).find(([, name]) => name === value)?.[0];
    if (!tag) throw new TypeError(`Unknown small-unit location: ${value}`);
    return tag;
  };
  const project = (
    value: ProtoMechState | BattleArmorState,
  ): Record<string, unknown> => ({
    unitType: value.unitType,
    year: value.year,
    mulId: value.mulId,
    techBase: value.techBase === TechBase.CLAN ? 'CLAN' : 'INNER_SPHERE',
    rulesLevel: RULES_LEVEL[value.rulesLevel],
    ...(value.unitType === UnitType.PROTOMECH
      ? {
          tonnage: value.tonnage,
          weightClass: value.weightClass.toUpperCase(),
          isQuad: value.chassisType === ProtoChassis.QUAD,
          isGlider: value.chassisType === ProtoChassis.GLIDER,
          hasMainGun: value.hasMainGun,
          engine: {
            type: value.librarySource?.engine?.type ?? 'FUSION',
            rating: value.engineRating,
          },
          movement: { cruiseMP: value.cruiseMP, jumpMP: value.jumpMP },
          armor: {
            type: Object.entries(PROTO_ARMOR_CODES).find(
              ([, code]) =>
                code ===
                (value.armorType || PROTO_ARMOR_CODES.STANDARD_PROTOMEK),
            )?.[0],
            byLocation: Object.fromEntries(
              Object.entries(value.armorByLocation).map(([key, points]) => [
                location(key),
                points,
              ]),
            ),
          },
          mainGun: {
            weapons: value.equipment
              .filter((mount) => mount.location === ProtoMechLocation.MAIN_GUN)
              .map((mount) => ({ id: mount.equipmentId, name: mount.name })),
          },
        }
      : {
          tonnage: value.squadSize,
          squadSize: value.squadSize,
          weightClass:
            value.weightClass === BattleArmorWeightClass.PA_L
              ? 'PAL'
              : value.weightClass.toUpperCase(),
          chassisType: value.chassisType.toUpperCase(),
          motionType: value.motionType.toUpperCase(),
          movement: {
            groundMP: value.groundMP,
            jumpMP: value.jumpMP,
            umuMP: value.umuMP,
          },
          armor: {
            type: battleArmorContractArmorType(value.armorType),
            perTrooper: value.armorPerTrooper,
          },
          armorPerTrooper: value.armorPerTrooper,
          manipulators: {
            leftArm: value.leftManipulator,
            rightArm: value.rightManipulator,
          },
          hasAntiPersonnelMount: value.hasAPMount,
          hasModularWeaponMount: value.hasModularMount,
        }),
    equipment: value.equipment.map((mount) => ({
      id: mount.equipmentId,
      name: mount.name,
      location: location(mount.location),
      ...('unitLocation' in mount ? { unitLocation: mount.unitLocation } : {}),
      ...('isAPMount' in mount ? { isAPMMounted: mount.isAPMount } : {}),
    })),
  });
  const baseline = source
    ? project(
        state.unitType === UnitType.PROTOMECH
          ? mapProtoMechDefinitionToState(source)
          : mapBattleArmorDefinitionToState(source),
      )
    : {};
  const patch = Object.fromEntries(
    Object.entries(project(state))
      .filter(
        ([key, value]) =>
          !source || JSON.stringify(value) !== JSON.stringify(baseline[key]),
      )
      .map(([key, value]) => {
        const original = source?.[key];
        return [
          key,
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          typeof original === 'object' &&
          original !== null &&
          !Array.isArray(original)
            ? { ...original, ...value }
            : value,
        ];
      }),
  );
  const definition = UnitContract.parse({
    ...source,
    ...patch,
    id: identity.id,
    chassis: identity.chassis,
    model: identity.variant,
    variant: identity.variant,
    family,
    unitType: state.unitType,
    era: source?.year === state.year ? source.era : identity.era,
    smallUnitEditor,
  });
  return { ...definition, family, smallUnitEditor };
}
