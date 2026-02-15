import type { ProtoMechState } from '@/stores/protoMechState';

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import {
  VehicleLocation,
  VTOLLocation,
  AerospaceLocation,
  ProtoMechLocation,
} from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import {
  GroundMotionType,
  SquadMotionType,
} from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
} from '@/types/unit/PersonnelInterfaces';

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

export function formatEngineTypeCode(engineType: EngineType): string {
  const codes: Record<string, string> = {
    [EngineType.STANDARD]: '0',
    [EngineType.XL_IS]: '1',
    [EngineType.XL_CLAN]: '2',
    [EngineType.LIGHT]: '3',
    [EngineType.COMPACT]: '4',
    [EngineType.XXL]: '5',
    [EngineType.ICE]: '6',
    [EngineType.FUEL_CELL]: '7',
    [EngineType.FISSION]: '8',
  };
  return codes[engineType] || '0';
}

export function formatArmorTypeCode(armorType: ArmorTypeEnum): string {
  const codes: Record<string, string> = {
    [ArmorTypeEnum.STANDARD]: '0',
    [ArmorTypeEnum.FERRO_FIBROUS_IS]: '1',
    [ArmorTypeEnum.FERRO_FIBROUS_CLAN]: '2',
    [ArmorTypeEnum.LIGHT_FERRO]: '3',
    [ArmorTypeEnum.HEAVY_FERRO]: '4',
    [ArmorTypeEnum.STEALTH]: '5',
    [ArmorTypeEnum.REACTIVE]: '6',
    [ArmorTypeEnum.REFLECTIVE]: '7',
    [ArmorTypeEnum.HARDENED]: '8',
  };
  return codes[armorType] || '0';
}

export function formatArmorTechCode(techBase: TechBase): string {
  return techBase === TechBase.CLAN ? '2' : '1';
}

export function formatVehicleArmor(
  allocation: Record<string, number>,
  isVTOL: boolean,
): string {
  const values: number[] = [
    allocation[VehicleLocation.FRONT] || 0,
    allocation[VehicleLocation.LEFT] || 0,
    allocation[VehicleLocation.RIGHT] || 0,
    allocation[VehicleLocation.REAR] || 0,
    allocation[VehicleLocation.TURRET] || 0,
  ];

  if (isVTOL) {
    values.push(allocation[VTOLLocation.ROTOR] || 0);
  }

  return values.join('\n');
}

export function formatAerospaceArmor(
  allocation: Record<string, number>,
): string {
  const values: number[] = [
    allocation[AerospaceLocation.NOSE] || 0,
    allocation[AerospaceLocation.LEFT_WING] || 0,
    allocation[AerospaceLocation.RIGHT_WING] || 0,
    allocation[AerospaceLocation.AFT] || 0,
  ];
  return values.join('\n');
}

export function formatProtoMechArmor(unit: ProtoMechState): string {
  const armor = unit.armorByLocation;
  const values: number[] = [
    armor[ProtoMechLocation.HEAD] || 0,
    armor[ProtoMechLocation.TORSO] || 0,
    armor[ProtoMechLocation.LEFT_ARM] || 0,
    armor[ProtoMechLocation.RIGHT_ARM] || 0,
    armor[ProtoMechLocation.LEGS] || 0,
    armor[ProtoMechLocation.MAIN_GUN] || 0,
  ];
  return values.join('\n');
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
