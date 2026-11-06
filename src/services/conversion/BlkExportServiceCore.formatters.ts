import type { ProtoMechState } from '@/stores/protoMechState';
import type { ArmorTypeEnum } from '@/types/construction/ArmorType';
import type { VehicleEngineType } from '@/types/construction/EngineType';

import {
  AerospaceLocation,
  VehicleLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import armorOrder from '@/types/formats/blk-aerospace-armor.json';
import {
  BLK_PROTOMECH_ARMOR_LOCATIONS,
  BLK_PROTOMECH_CHASSIS,
  BLK_VEHICLE_ARMOR_LOCATIONS,
  BLK_VTOL_ARMOR_LOCATIONS,
} from '@/types/formats/BlkFormat';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
} from '@/types/unit/PersonnelInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { encodeBlkArmorType } from './BlkArmorCodes';
import { encodeBlkEngine } from './blkEngineIdentity';

export function formatMotionType(motionType: GroundMotionType): string {
  const map: Record<GroundMotionType, string> = {
    [GroundMotionType.TRACKED]: 'Tracked',
    [GroundMotionType.WHEELED]: 'Wheeled',
    [GroundMotionType.HOVER]: 'Hover',
    [GroundMotionType.VTOL]: 'VTOL',
    [GroundMotionType.WIGE]: 'WiGE',
    [GroundMotionType.NAVAL]: 'Naval',
    [GroundMotionType.HYDROFOIL]: 'Hydrofoil',
    [GroundMotionType.SUBMARINE]: 'Submarine',
    [GroundMotionType.RAIL]: 'Rail',
    [GroundMotionType.MAGLEV]: 'Maglev',
  };
  return map[motionType] || 'Tracked';
}

export function formatBAMotionType(motionType: SquadMotionType): string {
  return motionType || SquadMotionType.FOOT;
}

export function formatBAChassisType(
  chassisType: BattleArmorChassisType,
): string {
  return chassisType || BattleArmorChassisType.BIPED;
}

export function formatBAWeightClass(
  weightClass: BattleArmorWeightClass,
): string {
  const map: Record<BattleArmorWeightClass, string> = {
    [BattleArmorWeightClass.PA_L]: '0',
    [BattleArmorWeightClass.LIGHT]: '1',
    [BattleArmorWeightClass.MEDIUM]: '2',
    [BattleArmorWeightClass.HEAVY]: '3',
    [BattleArmorWeightClass.ASSAULT]: '4',
  };
  return map[weightClass] || '2';
}

export function formatInfantryMotionType(motionType: SquadMotionType): string {
  return motionType || SquadMotionType.FOOT;
}

export function formatTechType(
  techBase: TechBase,
  rulesLevel: RulesLevel,
): string {
  const base = techBase === TechBase.CLAN ? 'Clan' : 'IS';
  const levelMap: Record<RulesLevel, string> = {
    [RulesLevel.INTRODUCTORY]: 'Level 1',
    [RulesLevel.STANDARD]: 'Level 2',
    [RulesLevel.ADVANCED]: 'Level 3',
    [RulesLevel.EXPERIMENTAL]: 'Level 4',
  };
  return `${base} ${levelMap[rulesLevel] || 'Level 2'}`;
}

export function formatEngineTypeCode(engineType: VehicleEngineType): string {
  return encodeBlkEngine(engineType);
}

export function formatArmorTypeCode(armorType: ArmorTypeEnum): string {
  return String(encodeBlkArmorType(armorType));
}

export function formatArmorTechCode(techBase: TechBase): string {
  return techBase === TechBase.CLAN ? '2' : '1';
}

/**
 * MegaMek reads the `<armor>` length to decide whether a vehicle has a turret
 * (`BLKTankFile.java:185`, `BLKVTOLFile.java:132`), so a turretless vehicle
 * stops before the Turret value: four values for a Tank, five for a VTOL.
 */
export function formatVehicleArmor(
  allocation: Record<string, number>,
  isVTOL: boolean,
  hasTurret: boolean,
): string {
  const locations = isVTOL
    ? BLK_VTOL_ARMOR_LOCATIONS
    : BLK_VEHICLE_ARMOR_LOCATIONS;
  return locations
    .filter((location) => hasTurret || location !== VehicleLocation.TURRET)
    .map((location) => allocation[location] || 0)
    .join('\n');
}

export function formatAerospaceArmor(
  allocation: Record<string, number>,
): string {
  const locations: Readonly<Record<string, AerospaceLocation>> = {
    NOSE: AerospaceLocation.NOSE,
    LEFT_WING: AerospaceLocation.LEFT_WING,
    RIGHT_WING: AerospaceLocation.RIGHT_WING,
    AFT: AerospaceLocation.AFT,
  };
  return armorOrder.fighter
    .map((arc) => allocation[locations[arc]] || 0)
    .join('\n');
}

export function formatProtoMechArmor(unit: ProtoMechState): string {
  const armor = unit.armorByLocation;
  const locations = unit.hasMainGun
    ? BLK_PROTOMECH_ARMOR_LOCATIONS
    : BLK_PROTOMECH_ARMOR_LOCATIONS.slice(0, -1);
  const values = locations.map((location) => armor[location] || 0);
  return values.join('\n');
}

export function formatProtoMechMotion(chassis: ProtoChassis): string {
  const effective =
    chassis === ProtoChassis.ULTRAHEAVY ? ProtoChassis.BIPED : chassis;
  const entry = Object.entries(BLK_PROTOMECH_CHASSIS).find(
    ([, value]) => value === effective,
  );
  if (!entry) throw new Error(`Unsupported ProtoMek chassis: ${chassis}`);
  return entry[0];
}

export function aerospaceLocationToBlockName(
  location: AerospaceLocation,
): string {
  const map: Record<AerospaceLocation, string> = {
    [AerospaceLocation.NOSE]: 'Nose',
    [AerospaceLocation.LEFT_WING]: 'Left Wing',
    [AerospaceLocation.RIGHT_WING]: 'Right Wing',
    [AerospaceLocation.AFT]: 'Aft',
    [AerospaceLocation.FUSELAGE]: 'Fuselage',
  };
  return map[location] || 'Nose';
}
