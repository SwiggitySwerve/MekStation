/**
 * Unit Loader Service - Component Type Mappers
 *
 * Functions for mapping string values from serialized units to typed enums.
 *
 * @spec openspec/specs/unit-services/spec.md
 */

import type { IUnitContract } from '@/types/contracts';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import {
  IArmorAllocation,
  createEmptyArmorAllocation,
} from '@/types/construction/ArmorAllocation';
import {
  ArmorTypeEnum,
  getNativeArmorType,
} from '@/types/construction/ArmorType';
import {
  CockpitType,
  getNativeCockpitType,
} from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType, getNativeGyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import {
  InternalStructureType,
  mapSerializedStructureType,
} from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  resolveUnitChassisTechBase,
  pickUnitTechBaseIdentity,
} from '@/types/construction/TechBaseConfiguration';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';

type RawArmorValue = number | { front: number; rear: number };
type RearArmorField = 'centerTorsoRear' | 'leftTorsoRear' | 'rightTorsoRear';

const ENGINE_TYPE_BY_NORMALIZED_VALUE: Readonly<Record<string, EngineType>> = {
  FUSION: EngineType.STANDARD,
  STANDARD: EngineType.STANDARD,
  STANDARDFUSION: EngineType.STANDARD,
  XLIS: EngineType.XL_IS,
  XLENGINEIS: EngineType.XL_IS,
  XLCLAN: EngineType.XL_CLAN,
  CLANXL: EngineType.XL_CLAN,
  XLENGINECLAN: EngineType.XL_CLAN,
  LIGHT: EngineType.LIGHT,
  LIGHTENGINE: EngineType.LIGHT,
  XXL: EngineType.XXL,
  XXLENGINE: EngineType.XXL,
  COMPACT: EngineType.COMPACT,
  COMPACTENGINE: EngineType.COMPACT,
  ICE: EngineType.ICE,
  INTERNALCOMBUSTION: EngineType.ICE,
  FUELCELL: EngineType.FUEL_CELL,
  FISSION: EngineType.FISSION,
};

const REAR_ARMOR_FIELD_BY_LOCATION: Partial<
  Record<MechLocation, RearArmorField>
> = {
  [MechLocation.CENTER_TORSO]: 'centerTorsoRear',
  [MechLocation.LEFT_TORSO]: 'leftTorsoRear',
  [MechLocation.RIGHT_TORSO]: 'rightTorsoRear',
};

/**
 * Map engine type string to EngineType enum
 */
export function mapEngineType(typeStr: string, techBase: TechBase): EngineType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');

  if (normalized === 'XL' || normalized === 'XLENGINE') {
    return techBase === TechBase.CLAN ? EngineType.XL_CLAN : EngineType.XL_IS;
  }

  return ENGINE_TYPE_BY_NORMALIZED_VALUE[normalized] ?? EngineType.STANDARD;
}

/**
 * Map gyro type string to GyroType enum
 */
export function mapGyroType(typeStr: string): GyroType {
  const native = getNativeGyroType(typeStr);
  if (native) return native;
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');

  if (normalized === 'XL' || normalized === 'XLGYRO') {
    return GyroType.XL;
  }
  if (normalized === 'COMPACT' || normalized === 'COMPACTGYRO') {
    return GyroType.COMPACT;
  }
  if (
    normalized === 'HEAVYDUTY' ||
    normalized === 'HEAVYDUTYGYRO' ||
    normalized === 'HD'
  ) {
    return GyroType.HEAVY_DUTY;
  }
  if (normalized === 'SUPERHEAVY' || normalized === 'SUPERHEAVYGYRO') {
    return GyroType.SUPERHEAVY;
  }

  return GyroType.STANDARD;
}

/**
 * Map structure type string to InternalStructureType enum
 */
export function mapStructureType(
  typeStr: string,
  techBase: TechBase,
): InternalStructureType {
  return mapSerializedStructureType(typeStr, techBase);
}

/**
 * Map cockpit type string to CockpitType enum
 */
export function mapCockpitType(typeStr: string): CockpitType {
  return getNativeCockpitType(typeStr) ?? CockpitType.STANDARD;
}

/**
 * Map heat sink type string to HeatSinkType enum
 */
export function mapHeatSinkType(typeStr: string): HeatSinkType {
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');

  if (
    normalized === 'DOUBLE' ||
    normalized === 'DOUBLEIS' ||
    normalized === 'DHS'
  ) {
    return HeatSinkType.DOUBLE_IS;
  }
  if (normalized === 'DOUBLECLAN') {
    return HeatSinkType.DOUBLE_CLAN;
  }
  if (normalized === 'LASER') {
    return HeatSinkType.LASER;
  }
  if (normalized === 'COMPACT') {
    return HeatSinkType.COMPACT;
  }

  return HeatSinkType.SINGLE;
}

/**
 * Map armor type string to ArmorTypeEnum
 */
export function resolveArmorType(
  typeStr: string,
  techBase: TechBase,
): ArmorTypeEnum | undefined {
  const native = getNativeArmorType(typeStr);
  if (native) return native;
  const normalized = typeStr.toUpperCase().replace(/[_\s-]/g, '');

  if (normalized === ArmorTypeEnum.STANDARD.toUpperCase()) {
    return ArmorTypeEnum.STANDARD;
  }

  if (normalized === 'FERROFIBROUS' || normalized === 'FERRO') {
    return techBase === TechBase.CLAN
      ? ArmorTypeEnum.FERRO_FIBROUS_CLAN
      : ArmorTypeEnum.FERRO_FIBROUS_IS;
  }
  if (normalized === 'FERROFIBROUSIS') {
    return ArmorTypeEnum.FERRO_FIBROUS_IS;
  }
  if (normalized === 'FERROFIBROUSCLAN') {
    return ArmorTypeEnum.FERRO_FIBROUS_CLAN;
  }
  if (normalized === 'LIGHTFERRO' || normalized === 'LIGHTFERROFIBROUS') {
    return ArmorTypeEnum.LIGHT_FERRO;
  }
  if (normalized === 'HEAVYFERRO' || normalized === 'HEAVYFERROFIBROUS') {
    return ArmorTypeEnum.HEAVY_FERRO;
  }
  if (normalized === 'STEALTH') {
    return ArmorTypeEnum.STEALTH;
  }
  if (normalized === 'REACTIVE') {
    return ArmorTypeEnum.REACTIVE;
  }
  if (normalized === 'REFLECTIVE' || normalized === 'LASERREFLECTIVE') {
    return ArmorTypeEnum.REFLECTIVE;
  }
  if (normalized === 'HARDENED') {
    return ArmorTypeEnum.HARDENED;
  }
  if (normalized === 'FERROLAMELLOR') {
    return ArmorTypeEnum.FERRO_LAMELLOR;
  }
  if (normalized === 'BALLISTICREINFORCED') {
    return ArmorTypeEnum.BALLISTIC_REINFORCED;
  }
  // The facade retains the existing Standard fallback for unresolved identities.

  return undefined;
}

/** Preserve the existing fallback; diagnostics read the same resolution result. */
export function mapArmorType(
  typeStr: string,
  techBase: TechBase,
): ArmorTypeEnum {
  return resolveArmorType(typeStr, techBase) ?? ArmorTypeEnum.STANDARD;
}

/**
 * Map tech base string to TechBase enum
 */
export function mapTechBase(techBaseStr: string): TechBase {
  const normalized = techBaseStr.toUpperCase().replace(/[_\s-]/g, '');

  if (normalized === 'CLAN') {
    return TechBase.CLAN;
  }
  if (normalized === 'MIXED') {
    return TechBase.INNER_SPHERE; // Mixed defaults to IS base
  }

  return TechBase.INNER_SPHERE;
}

/**
 * Map unit tech base string to TechBaseMode.
 * Mixed tech applies at the unit level (TechBaseMode), while components remain binary (TechBase).
 */
export function mapTechBaseMode(techBaseStr: string): TechBaseMode {
  const normalized = techBaseStr.toUpperCase().replace(/[_\s-]/g, '');

  if (normalized === 'CLAN') {
    return TechBaseMode.CLAN;
  }
  if (normalized === 'MIXED') {
    return TechBaseMode.MIXED;
  }

  return TechBaseMode.INNER_SPHERE;
}

/**
 * Preserve unit identity after the existing component projection, including
 * saved binary editor snapshots. MegaMek 48fcb2f64 BLKFile.setTechLevel keeps
 * Mixed mode and chassis side separately; a binary fallback is not evidence.
 */
export function mapUnitTechBaseIdentity(
  family: UnitFamily,
  definition: IUnitContract,
) {
  if (
    mapTechBaseMode(definition.techBase ?? 'INNER_SPHERE') !==
    TechBaseMode.MIXED
  )
    return {};
  const chassisTechBase = resolveUnitChassisTechBase(family, definition);
  return {
    ...pickUnitTechBaseIdentity({
      techBaseMode: TechBaseMode.MIXED,
      chassisTechBase,
    }),
    ...(chassisTechBase === undefined ? {} : { techBase: chassisTechBase }),
  };
}

/**
 * Map rules level string to RulesLevel enum
 */
export function mapRulesLevel(levelStr: string): RulesLevel {
  const normalized = levelStr.toUpperCase().replace(/[_\s-]/g, '');

  if (normalized === 'INTRODUCTORY' || normalized === 'INTRO') {
    return RulesLevel.INTRODUCTORY;
  }
  if (normalized === 'ADVANCED') {
    return RulesLevel.ADVANCED;
  }
  if (normalized === 'EXPERIMENTAL') {
    return RulesLevel.EXPERIMENTAL;
  }
  // ERA is mapped to ADVANCED for now

  return RulesLevel.STANDARD;
}

/**
 * Map MechLocation string to MechLocation enum
 */
export function mapMechLocation(locationStr: string): MechLocation | undefined {
  const normalized = locationStr.toUpperCase().replace(/[_\s-]/g, '');

  const locationMap: Record<string, MechLocation> = {
    // Universal locations
    HEAD: MechLocation.HEAD,
    HD: MechLocation.HEAD,
    CENTERTORSO: MechLocation.CENTER_TORSO,
    CT: MechLocation.CENTER_TORSO,
    LEFTTORSO: MechLocation.LEFT_TORSO,
    LT: MechLocation.LEFT_TORSO,
    RIGHTTORSO: MechLocation.RIGHT_TORSO,
    RT: MechLocation.RIGHT_TORSO,
    // Biped/Tripod/LAM arm locations
    LEFTARM: MechLocation.LEFT_ARM,
    LA: MechLocation.LEFT_ARM,
    RIGHTARM: MechLocation.RIGHT_ARM,
    RA: MechLocation.RIGHT_ARM,
    // Biped/Tripod/LAM leg locations
    LEFTLEG: MechLocation.LEFT_LEG,
    LL: MechLocation.LEFT_LEG,
    RIGHTLEG: MechLocation.RIGHT_LEG,
    RL: MechLocation.RIGHT_LEG,
    // Tripod center leg
    CENTERLEG: MechLocation.CENTER_LEG,
    CL: MechLocation.CENTER_LEG,
    // Quad/QuadVee leg locations
    FRONTLEFTLEG: MechLocation.FRONT_LEFT_LEG,
    FLL: MechLocation.FRONT_LEFT_LEG,
    FRONTRIGHTLEG: MechLocation.FRONT_RIGHT_LEG,
    FRL: MechLocation.FRONT_RIGHT_LEG,
    REARLEFTLEG: MechLocation.REAR_LEFT_LEG,
    RLL: MechLocation.REAR_LEFT_LEG,
    REARRIGHTLEG: MechLocation.REAR_RIGHT_LEG,
    RRL: MechLocation.REAR_RIGHT_LEG,
  };

  return locationMap[normalized];
}

/**
 * Set armor value for a specific location in IArmorAllocation
 */
function setArmorValue(
  result: IArmorAllocation,
  location: MechLocation,
  value: number,
): void {
  result[location] = value;
}

function isSplitArmorValue(value: unknown): value is {
  front: number;
  rear: number;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'front' in value &&
    'rear' in value
  );
}

function setRearArmorValue(
  result: IArmorAllocation,
  location: MechLocation,
  value: number,
): void {
  const field = REAR_ARMOR_FIELD_BY_LOCATION[location];
  if (!field) {
    return;
  }

  result[field] = value;
}

function applyArmorAllocationEntry(
  result: IArmorAllocation,
  locationKey: string,
  value: RawArmorValue,
): void {
  const location = mapMechLocation(locationKey);
  if (location === undefined) {
    return;
  }

  if (typeof value === 'number') {
    setArmorValue(result, location, value);
    return;
  }

  if (!isSplitArmorValue(value)) {
    return;
  }

  setArmorValue(result, location, value.front);
  setRearArmorValue(result, location, value.rear);
}

/**
 * Map armor allocation from JSON format to IArmorAllocation
 */
export function mapArmorAllocation(
  allocation: Record<string, RawArmorValue> | undefined,
): IArmorAllocation {
  if (!allocation) {
    return createEmptyArmorAllocation();
  }

  const result = createEmptyArmorAllocation();

  for (const [locationKey, value] of Object.entries(allocation)) {
    applyArmorAllocationEntry(result, locationKey, value);
  }

  return result;
}
