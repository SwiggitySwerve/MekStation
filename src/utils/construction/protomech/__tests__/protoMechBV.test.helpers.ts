import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  ProtoChassis,
  ProtoLocation,
  ProtoWeightClass,
  type IProtoArmorByLocation,
  type IProtoMechMountedEquipment,
  type IProtoMechUnit,
} from '@/types/unit/ProtoMechInterfaces';

export type ProtoBuildOverrides = Partial<IProtoMechUnit> & {
  tonnage: number;
};

const ZERO_ARMOR: IProtoArmorByLocation = {
  [ProtoLocation.HEAD]: 0,
  [ProtoLocation.TORSO]: 0,
  [ProtoLocation.LEFT_ARM]: 0,
  [ProtoLocation.RIGHT_ARM]: 0,
  [ProtoLocation.LEGS]: 0,
  [ProtoLocation.MAIN_GUN]: 0,
};

export function armor(
  partial: Partial<IProtoArmorByLocation>,
): IProtoArmorByLocation {
  return { ...ZERO_ARMOR, ...partial };
}

/**
 * Build a minimal IProtoMechUnit for BV testing. Every field the BV
 * calculator reads is populated; other identity fields get sensible defaults
 * so the fixture can round-trip through any other proto code paths.
 */
export function buildProto(overrides: ProtoBuildOverrides): IProtoMechUnit {
  const { tonnage } = overrides;
  const walkMP = overrides.walkMP ?? 4;
  const movementDefaults = {
    runMP: walkMP + 1,
    engineRating: tonnage * walkMP,
    engineWeight: tonnage * walkMP * 0.025,
  };

  const defaults: IProtoMechUnit = {
    id: 'proto-test',
    name: 'Test Proto',
    chassis: 'Test',
    model: 'Prime',
    mulId: 'TEST-1',
    year: 3075,
    unitType: UnitType.PROTOMECH,
    techBase: TechBase.CLAN,
    tonnage,
    weightClass: ProtoWeightClass.LIGHT,
    chassisType: ProtoChassis.BIPED,
    pointSize: 5,
    walkMP,
    runMP: movementDefaults.runMP,
    jumpMP: 0,
    engineRating: movementDefaults.engineRating,
    engineWeight: movementDefaults.engineWeight,
    myomerBooster: false,
    glidingWings: false,
    armorType: 'Standard',
    armorByLocation: armor({}),
    structureByLocation: armor({}),
    hasMainGun: false,
    mainGunWeaponId: undefined,
    equipment: [],
    isModified: false,
    createdAt: 0,
    lastModifiedAt: 0,
  };

  return {
    ...defaults,
    ...overrides,
    tonnage,
    walkMP,
    runMP: overrides.runMP ?? defaults.runMP,
    engineRating: overrides.engineRating ?? defaults.engineRating,
    engineWeight: overrides.engineWeight ?? defaults.engineWeight,
    armorByLocation: overrides.armorByLocation ?? defaults.armorByLocation,
    structureByLocation:
      overrides.structureByLocation ?? defaults.structureByLocation,
    equipment: overrides.equipment ?? defaults.equipment,
    hasMainGun: overrides.hasMainGun ?? defaults.hasMainGun,
    unitType: UnitType.PROTOMECH,
    armorType: 'Standard',
    isModified: false,
    createdAt: 0,
    lastModifiedAt: 0,
  };
}

export function mount(
  id: string,
  location: ProtoLocation,
  isMainGun = false,
): IProtoMechMountedEquipment {
  return {
    id: `m-${id}-${location}`,
    equipmentId: id,
    name: id,
    location,
    linkedAmmoId: undefined,
    isMainGun,
  };
}
