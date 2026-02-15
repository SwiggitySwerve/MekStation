import {
  GyroType,
  HeatSinkType,
  MechLocation,
  IArmorAllocation,
} from '@/types/construction';
import {
  IEngineConfiguration,
  IGyroConfiguration,
  IHeatSinkConfiguration,
} from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';
import { calculateEngineWeight } from '@/utils/construction/engineCalculations';

export function getStructurePoints(
  location: MechLocation,
  tonnage: number,
): number {
  const structureTable: Record<number, Record<string, number>> = {
    20: { HEAD: 3, CT: 6, TORSO: 5, ARM: 3, LEG: 4 },
    25: { HEAD: 3, CT: 8, TORSO: 6, ARM: 4, LEG: 6 },
    30: { HEAD: 3, CT: 10, TORSO: 7, ARM: 5, LEG: 7 },
    35: { HEAD: 3, CT: 11, TORSO: 8, ARM: 6, LEG: 8 },
    40: { HEAD: 3, CT: 12, TORSO: 10, ARM: 6, LEG: 10 },
    45: { HEAD: 3, CT: 14, TORSO: 11, ARM: 7, LEG: 11 },
    50: { HEAD: 3, CT: 16, TORSO: 12, ARM: 8, LEG: 12 },
    55: { HEAD: 3, CT: 18, TORSO: 13, ARM: 9, LEG: 13 },
    60: { HEAD: 3, CT: 20, TORSO: 14, ARM: 10, LEG: 14 },
    65: { HEAD: 3, CT: 21, TORSO: 15, ARM: 10, LEG: 15 },
    70: { HEAD: 3, CT: 22, TORSO: 15, ARM: 11, LEG: 15 },
    75: { HEAD: 3, CT: 23, TORSO: 16, ARM: 12, LEG: 16 },
    80: { HEAD: 3, CT: 25, TORSO: 17, ARM: 13, LEG: 17 },
    85: { HEAD: 3, CT: 27, TORSO: 18, ARM: 14, LEG: 18 },
    90: { HEAD: 3, CT: 29, TORSO: 19, ARM: 15, LEG: 19 },
    95: { HEAD: 3, CT: 30, TORSO: 20, ARM: 16, LEG: 20 },
    100: { HEAD: 3, CT: 31, TORSO: 21, ARM: 17, LEG: 21 },
  };

  const roundedTonnage = Math.min(
    100,
    Math.max(20, Math.round(tonnage / 5) * 5),
  );
  const table = structureTable[roundedTonnage] || structureTable[100];

  switch (location) {
    case MechLocation.HEAD:
      return table.HEAD;
    case MechLocation.CENTER_TORSO:
      return table.CT;
    case MechLocation.LEFT_TORSO:
    case MechLocation.RIGHT_TORSO:
      return table.TORSO;
    case MechLocation.LEFT_ARM:
    case MechLocation.RIGHT_ARM:
      return table.ARM;
    case MechLocation.LEFT_LEG:
    case MechLocation.RIGHT_LEG:
      return table.LEG;
    default:
      return 0;
  }
}

export function calculateGyroWeight(
  engineRating: number,
  gyroType: GyroType,
): number {
  const baseWeight = Math.ceil(engineRating / 100);
  switch (gyroType) {
    case GyroType.XL:
      return Math.ceil(baseWeight / 2);
    case GyroType.COMPACT:
      return Math.ceil(baseWeight * 1.5);
    case GyroType.HEAVY_DUTY:
      return baseWeight * 2;
    default:
      return baseWeight;
  }
}

export function buildStructurePoints(
  tonnage: number,
): Partial<Record<MechLocation, number>> {
  return {
    [MechLocation.HEAD]: getStructurePoints(MechLocation.HEAD, tonnage),
    [MechLocation.CENTER_TORSO]: getStructurePoints(
      MechLocation.CENTER_TORSO,
      tonnage,
    ),
    [MechLocation.LEFT_TORSO]: getStructurePoints(
      MechLocation.LEFT_TORSO,
      tonnage,
    ),
    [MechLocation.RIGHT_TORSO]: getStructurePoints(
      MechLocation.RIGHT_TORSO,
      tonnage,
    ),
    [MechLocation.LEFT_ARM]: getStructurePoints(MechLocation.LEFT_ARM, tonnage),
    [MechLocation.RIGHT_ARM]: getStructurePoints(
      MechLocation.RIGHT_ARM,
      tonnage,
    ),
    [MechLocation.LEFT_LEG]: getStructurePoints(MechLocation.LEFT_LEG, tonnage),
    [MechLocation.RIGHT_LEG]: getStructurePoints(
      MechLocation.RIGHT_LEG,
      tonnage,
    ),
  };
}

function locationToCamelCase(location: string): string {
  const mapping: Record<string, string> = {
    HEAD: 'head',
    CENTER_TORSO: 'centerTorso',
    LEFT_TORSO: 'leftTorso',
    RIGHT_TORSO: 'rightTorso',
    LEFT_ARM: 'leftArm',
    RIGHT_ARM: 'rightArm',
    LEFT_LEG: 'leftLeg',
    RIGHT_LEG: 'rightLeg',
  };
  return mapping[location] || location.toLowerCase();
}

export function buildArmorAllocation(
  allocation: Record<string, number | { front: number; rear: number }>,
): IArmorAllocation {
  const result: IArmorAllocation = {
    head: 0,
    centerTorso: 0,
    centerTorsoRear: 0,
    leftTorso: 0,
    leftTorsoRear: 0,
    rightTorso: 0,
    rightTorsoRear: 0,
    leftArm: 0,
    rightArm: 0,
    leftLeg: 0,
    rightLeg: 0,
  };

  for (const [location, value] of Object.entries(allocation)) {
    const camelKey = locationToCamelCase(location) as keyof IArmorAllocation;

    if (typeof value === 'number') {
      if (camelKey in result) {
        (result as Record<keyof IArmorAllocation, number>)[camelKey] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      if (camelKey in result) {
        (result as Record<keyof IArmorAllocation, number>)[camelKey] =
          value.front;
      }
      const rearKey = `${camelKey}Rear` as keyof IArmorAllocation;
      if (rearKey in result) {
        (result as Record<keyof IArmorAllocation, number>)[rearKey] =
          value.rear;
      }
    }
  }

  return result;
}

export function calculateTotalArmor(allocation: IArmorAllocation): number {
  let total = 0;
  for (const value of Object.values(allocation)) {
    if (typeof value === 'number') {
      total += value;
    }
  }
  return total;
}

export function calculateTotalWeight(
  data: ISerializedUnit,
  engine: IEngineConfiguration,
  gyro: IGyroConfiguration,
  heatSinks: IHeatSinkConfiguration,
): number {
  let weight = 0;

  weight += data.tonnage * 0.1;

  const engineWeight = calculateEngineWeight(engine.rating, engine.type);
  weight += engineWeight;

  weight += gyro.weight;

  weight += 3;

  weight +=
    heatSinks.external * (heatSinks.type === HeatSinkType.SINGLE ? 1 : 1);

  let totalArmor = 0;
  for (const val of Object.values(data.armor.allocation)) {
    if (typeof val === 'number') {
      totalArmor += val;
    } else if (
      typeof val === 'object' &&
      val !== null &&
      'front' in val &&
      'rear' in val
    ) {
      totalArmor += val.front + val.rear;
    }
  }
  weight += totalArmor / 16;

  if (data.movement.jump > 0) {
    const jjWeight = data.tonnage <= 55 ? 0.5 : data.tonnage <= 85 ? 1 : 2;
    weight += data.movement.jump * jjWeight;
  }

  return Math.round(weight * 2) / 2;
}
