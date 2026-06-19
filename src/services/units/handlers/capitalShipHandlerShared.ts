import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  CapitalArc,
  ICapitalCrewConfiguration,
  ICapitalMountedEquipment,
  ICrewQuarters,
  ITransportBay,
  QuartersType,
} from '@/types/unit/CapitalShipInterfaces';

import type { AerospaceUnitCoreFields } from './unitHandlerShared';

import {
  parseCapitalTransporterString,
  type ITransportBayTypeRule,
} from './transportBayParsing';

export interface CapitalArmorByArc {
  readonly nose: number;
  readonly frontLeftSide: number;
  readonly frontRightSide: number;
  readonly aftLeftSide: number;
  readonly aftRightSide: number;
  readonly aft: number;
  readonly leftBroadside?: number;
  readonly rightBroadside?: number;
}

export interface CapitalVesselBasics extends AerospaceUnitCoreFields {
  readonly engineType?: number;
  readonly armorType: number;
  readonly armor: readonly number[];
  readonly armorByArc: CapitalArmorByArc;
  readonly totalArmorPoints: number;
}

interface CapitalVesselBasicOptions {
  readonly includeEngineType?: boolean;
  readonly includeBroadsides?: boolean;
}

interface CapitalEquipmentOptions {
  readonly arcAliases?: Record<string, CapitalArc>;
  readonly capitalWeaponTerms?: readonly string[];
}

const BASE_CAPITAL_ARC_ALIASES: Record<string, CapitalArc> = {
  nose: CapitalArc.NOSE,
  'nose equipment': CapitalArc.NOSE,
  'front left': CapitalArc.FRONT_LEFT,
  fl: CapitalArc.FRONT_LEFT,
  'fl equipment': CapitalArc.FRONT_LEFT,
  'front right': CapitalArc.FRONT_RIGHT,
  fr: CapitalArc.FRONT_RIGHT,
  'fr equipment': CapitalArc.FRONT_RIGHT,
  'aft left': CapitalArc.AFT_LEFT,
  al: CapitalArc.AFT_LEFT,
  'al equipment': CapitalArc.AFT_LEFT,
  'aft right': CapitalArc.AFT_RIGHT,
  ar: CapitalArc.AFT_RIGHT,
  'ar equipment': CapitalArc.AFT_RIGHT,
  aft: CapitalArc.AFT,
  'aft equipment': CapitalArc.AFT,
  'left broadside': CapitalArc.LEFT_BROADSIDE,
  lbs: CapitalArc.LEFT_BROADSIDE,
  'lbs equipment': CapitalArc.LEFT_BROADSIDE,
  'right broadside': CapitalArc.RIGHT_BROADSIDE,
  rbs: CapitalArc.RIGHT_BROADSIDE,
  'rbs equipment': CapitalArc.RIGHT_BROADSIDE,
};

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

export function parseCapitalArmorByArc(
  armor: readonly number[],
  includeBroadsides = false,
): CapitalArmorByArc {
  const [
    nose = 0,
    frontLeftSide = 0,
    frontRightSide = 0,
    aftLeftSide = 0,
    aftRightSide = 0,
    aft = 0,
  ] = armor;
  const armorByArc: CapitalArmorByArc = {
    nose,
    frontLeftSide,
    frontRightSide,
    aftLeftSide,
    aftRightSide,
    aft,
  };

  return includeBroadsides
    ? { ...armorByArc, leftBroadside: armor[6], rightBroadside: armor[7] }
    : armorByArc;
}

export function parseCapitalVesselBasics(
  document: IBlkDocument,
  options: CapitalVesselBasicOptions = {},
): CapitalVesselBasics {
  const safeThrust = document.safeThrust || 0;
  const armor = document.armor || [];
  const includeEngineType = options.includeEngineType ?? true;

  return {
    movement: { safeThrust, maxThrust: Math.floor(safeThrust * 1.5) },
    fuel: document.fuel || 0,
    structuralIntegrity: document.structuralIntegrity || 0,
    heatSinks: document.heatsinks || 0,
    heatSinkType: document.sinkType || 0,
    ...(includeEngineType ? { engineType: document.engineType || 0 } : {}),
    armorType: document.armorType || 0,
    armor,
    armorByArc: parseCapitalArmorByArc(armor, options.includeBroadsides),
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
      const arc = aliases[locationKey.toLowerCase()] || CapitalArc.NOSE;
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
