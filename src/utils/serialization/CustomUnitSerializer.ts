import type { UnitState } from '@/stores/unitState';
import type { IMountedEquipmentInstance } from '@/types/equipment/MountedEquipment';
import type { Era } from '@/types/temporal/Era';
import type {
  ISerializedArmor,
  ISerializedCriticalSlots,
  ISerializedEquipment,
  ISerializedUnit,
} from '@/types/unit/UnitSerialization';

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
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { JumpJetType } from '@/utils/construction/movementCalculations';

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
  [GyroType.SUPERHEAVY]: 'STANDARD',
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
    ...(item.linkedAmmoId ? { linkedAmmo: item.linkedAmmoId } : {}),
  }));
}

function serializeCriticalSlots(
  equipment: readonly IMountedEquipmentInstance[],
): ISerializedCriticalSlots {
  const result: Record<string, (string | null)[]> = {};

  for (const item of equipment) {
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
    criticalSlots: serializeCriticalSlots(state.equipment),
    isOmni: state.isOmni,
    baseChassisHeatSinks: state.baseChassisHeatSinks,
    clanName: state.clanName || undefined,
  };
}
