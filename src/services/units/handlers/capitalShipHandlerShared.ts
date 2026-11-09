import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  CapitalArc,
  ICapitalCrewConfiguration,
  ICapitalMountedEquipment,
  ICrewQuarters,
  ITransportBay,
  QuartersType,
} from '@/types/unit/CapitalShipInterfaces';
import { calculateMaxThrust } from '@/utils/construction/aerospace/thrustCalculations';

import type { AerospaceUnitCoreFields } from './unitHandlerShared';

import {
  parseCapitalTransporterString,
  type ITransportBayTypeRule,
} from './transportBayParsing';

/**
 * WarShip, JumpShip and Space Station armor, in BLK source order. The source array
 * is exactly six values: Nose, Left Front Side, Right Front Side, Aft, Aft Left
 * Side, Aft Right Side (`initializeArmor(armor[i], i)` over Jumpship.java:101-102
 * LOCATION_NAMES; BLKWarshipFile.java:258-263, BLKJumpshipFile.java:229-234,
 * BLKSpaceStationFile.java:225-230). Hull and the WarShip broadsides are never
 * armored (BLKWarshipFile.java:265-267).
 */
export interface CapitalArmorByArc {
  readonly nose: number;
  readonly frontLeftSide: number;
  readonly frontRightSide: number;
  readonly aft: number;
  readonly aftLeftSide: number;
  readonly aftRightSide: number;
}

/**
 * DropShip armor, in BLK source order: exactly four values, Nose, Right Side, Left
 * Side, Aft (`armor[BLKAeroSpaceFighterFile.RW]` goes to the right wing,
 * BLKDropshipFile.java:192-199; BLKAeroSpaceFighterFile.java:63-66).
 */
export interface DropShipArmorByArc {
  readonly nose: number;
  readonly rightSide: number;
  readonly leftSide: number;
  readonly aft: number;
}

export interface CapitalVesselBasics extends AerospaceUnitCoreFields {
  readonly engineType?: number;
  readonly armorType: number;
  readonly armor: readonly number[];
  readonly totalArmorPoints: number;
}

interface CapitalVesselBasicOptions {
  readonly includeEngineType?: boolean;
}

interface CapitalEquipmentOptions {
  readonly arcAliases?: Record<string, CapitalArc>;
  readonly capitalWeaponTerms?: readonly string[];
  /** Receives a diagnostic for each equipment block that names no known location. */
  readonly errors?: string[];
}

/**
 * Equipment location -> arc, keyed by lower-cased block name without the trailing
 * " Equipment". Real names are the pinned location names (Jumpship.java:101-102,
 * Warship.java:67-69) and the legacy tags the loaders still read
 * (BLKWarshipFile.java:281-284, BLKJumpshipFile.java:249-250); the short forms
 * are the CapitalArc codes.
 */
const BASE_CAPITAL_ARC_ALIASES: Record<string, CapitalArc> = {
  nose: CapitalArc.NOSE,
  'left front side': CapitalArc.FRONT_LEFT,
  'front left side': CapitalArc.FRONT_LEFT,
  'front left': CapitalArc.FRONT_LEFT,
  fl: CapitalArc.FRONT_LEFT,
  'right front side': CapitalArc.FRONT_RIGHT,
  'front right side': CapitalArc.FRONT_RIGHT,
  'front right': CapitalArc.FRONT_RIGHT,
  fr: CapitalArc.FRONT_RIGHT,
  'aft left side': CapitalArc.AFT_LEFT,
  'aft left': CapitalArc.AFT_LEFT,
  al: CapitalArc.AFT_LEFT,
  'aft right side': CapitalArc.AFT_RIGHT,
  'aft right': CapitalArc.AFT_RIGHT,
  ar: CapitalArc.AFT_RIGHT,
  aft: CapitalArc.AFT,
  'left broadsides': CapitalArc.LEFT_BROADSIDE,
  'left broadside': CapitalArc.LEFT_BROADSIDE,
  lbs: CapitalArc.LEFT_BROADSIDE,
  'right broadsides': CapitalArc.RIGHT_BROADSIDE,
  'right broadside': CapitalArc.RIGHT_BROADSIDE,
  rbs: CapitalArc.RIGHT_BROADSIDE,
  hull: CapitalArc.HULL,
};

/** DropShip side blocks are the front-left/right BV arcs (DropShipBVCalculator.java:78-90). */
export const DROPSHIP_ARC_ALIASES: Record<string, CapitalArc> = {
  'left side': CapitalArc.FRONT_LEFT,
  'right side': CapitalArc.FRONT_RIGHT,
};

const CAPITAL_ARMOR_COUNT = 6;
const DROPSHIP_ARMOR_COUNT = 4;

function pushArmorCountError(
  errors: string[],
  armor: readonly number[],
  expected: number,
  order: string,
): void {
  if (armor.length !== expected) {
    errors.push(
      `Expected exactly ${expected} armor values (${order}), found ${armor.length}`,
    );
  }
}

export const EXTENDED_CAPITAL_WEAPON_TERMS = [
  'naval',
  'capital',
  'mass driver',
  'kraken',
  'killer whale',
  'white shark',
  'barracuda',
] as const;

const BASE_CAPITAL_WEAPON_TERMS = EXTENDED_CAPITAL_WEAPON_TERMS.slice(0, 3);

/** WarShip/JumpShip/Space Station armor by arc; a wrong-length array is an error, as in Java. */
export function parseCapitalArmorByArc(
  armor: readonly number[],
  errors: string[],
): CapitalArmorByArc {
  pushArmorCountError(
    errors,
    armor,
    CAPITAL_ARMOR_COUNT,
    'Nose, Front Left, Front Right, Aft, Aft Left, Aft Right',
  );
  const [
    nose = 0,
    frontLeftSide = 0,
    frontRightSide = 0,
    aft = 0,
    aftLeftSide = 0,
    aftRightSide = 0,
  ] = armor;
  return {
    nose,
    frontLeftSide,
    frontRightSide,
    aft,
    aftLeftSide,
    aftRightSide,
  };
}

/** DropShip armor by location; a wrong-length array is an error, as in Java. */
export function parseDropShipArmorByArc(
  armor: readonly number[],
  errors: string[],
): DropShipArmorByArc {
  pushArmorCountError(
    errors,
    armor,
    DROPSHIP_ARMOR_COUNT,
    'Nose, Right Side, Left Side, Aft',
  );
  const [nose = 0, rightSide = 0, leftSide = 0, aft = 0] = armor;
  return { nose, rightSide, leftSide, aft };
}

export function parseCapitalVesselBasics(
  document: IBlkDocument,
  options: CapitalVesselBasicOptions = {},
): CapitalVesselBasics {
  const safeThrust = document.safeThrust || 0;
  const armor = document.armor || [];
  const includeEngineType = options.includeEngineType ?? true;

  return {
    movement: { safeThrust, maxThrust: calculateMaxThrust(safeThrust) },
    fuel: document.fuel || 0,
    structuralIntegrity: document.structuralIntegrity || 0,
    heatSinks: document.heatsinks || 0,
    heatSinkType: document.sinkType || 0,
    ...(includeEngineType ? { engineType: document.engineType || 0 } : {}),
    armorType: document.armorType || 0,
    armor,
    totalArmorPoints: armor.reduce((sum, val) => sum + val, 0),
  };
}

export function buildCapitalCrewConfiguration(
  document: IBlkDocument,
  pilots: number,
): ICapitalCrewConfiguration {
  return {
    crew: document.crew || 0,
    officers: document.officers || 0,
    gunners: document.gunners || 0,
    pilots,
    marines: document.marines || 0,
    battleArmor: document.battlearmor || 0,
    passengers: document.passengers || 0,
    other: document.otherpassenger || 0,
  };
}

export function parseCapitalTransportBays(
  document: IBlkDocument,
  rules?: readonly ITransportBayTypeRule[],
): readonly ITransportBay[] {
  return (document.transporters || []).reduce<ITransportBay[]>(
    (bays, transporter) => {
      const parsed = parseCapitalTransporterString(
        transporter,
        bays.length + 1,
        rules,
      );
      if (parsed) bays.push(parsed);
      return bays;
    },
    [],
  );
}

export function parseCapitalCrewQuarters(
  document: IBlkDocument,
  passengerQuarters: QuartersType = QuartersType.STEERAGE,
): readonly ICrewQuarters[] {
  const quarters: ICrewQuarters[] = [];
  const crew = document.crew || 0;
  const passengers = document.passengers || 0;

  if (crew > 0) quarters.push({ type: QuartersType.CREW, capacity: crew });
  if (passengers > 0) {
    quarters.push({ type: passengerQuarters, capacity: passengers });
  }

  return quarters;
}

export function parseCapitalEquipment(
  document: IBlkDocument,
  options: CapitalEquipmentOptions = {},
): readonly ICapitalMountedEquipment[] {
  const aliases = { ...BASE_CAPITAL_ARC_ALIASES, ...options.arcAliases };
  const terms = options.capitalWeaponTerms || BASE_CAPITAL_WEAPON_TERMS;
  let mountId = 0;

  return Object.entries(document.equipmentByLocation).flatMap(
    ([locationKey, items]) => {
      const key = locationKey.toLowerCase().replace(/ equipment$/, '');
      const arc = Object.hasOwn(aliases, key) ? aliases[key] : undefined;
      if (arc === undefined) {
        options.errors?.push(
          `Unrecognized equipment location "${locationKey}"`,
        );
        return [];
      }
      return items.map((item) => ({
        id: `mount-${mountId++}`,
        equipmentId: item,
        name: item,
        arc,
        isCapital: terms.some((term) => item.toLowerCase().includes(term)),
      }));
    },
  );
}
