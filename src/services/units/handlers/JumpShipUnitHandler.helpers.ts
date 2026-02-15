import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ICapitalMountedEquipment,
  ITransportBay,
  ICrewQuarters,
  ICapitalCrewConfiguration,
  BayType,
  QuartersType,
  CapitalArc,
} from '@/types/unit/CapitalShipInterfaces';

import { IJumpShip } from './JumpShipUnitHandler';

const ARC_MAP: Record<string, CapitalArc> = {
  nose: CapitalArc.NOSE,
  'nose equipment': CapitalArc.NOSE,
  'front left': CapitalArc.FRONT_LEFT,
  'fl equipment': CapitalArc.FRONT_LEFT,
  'front right': CapitalArc.FRONT_RIGHT,
  'fr equipment': CapitalArc.FRONT_RIGHT,
  'aft left': CapitalArc.AFT_LEFT,
  'al equipment': CapitalArc.AFT_LEFT,
  'aft right': CapitalArc.AFT_RIGHT,
  'ar equipment': CapitalArc.AFT_RIGHT,
  aft: CapitalArc.AFT,
  'aft equipment': CapitalArc.AFT,
};

export function parseArmorByArc(armor: readonly number[]): {
  nose: number;
  frontLeftSide: number;
  frontRightSide: number;
  aftLeftSide: number;
  aftRightSide: number;
  aft: number;
} {
  return {
    nose: armor[0] || 0,
    frontLeftSide: armor[1] || 0,
    frontRightSide: armor[2] || 0,
    aftLeftSide: armor[3] || 0,
    aftRightSide: armor[4] || 0,
    aft: armor[5] || 0,
  };
}

export function parseKFDrive(
  rawTags: Record<string, string | string[]>,
  tonnage: number,
): IJumpShip['kfDrive'] {
  const rating =
    parseNumericRaw(rawTags, 'kfrating') || Math.ceil(tonnage / 10000);
  const integrityPoints = parseNumericRaw(rawTags, 'kfintegrity') || 4;
  const hasDriveCore = true;
  const hasLithiumFusion = getBooleanFromRaw(rawTags, 'lithiumfusion') || false;

  return { rating, integrityPoints, hasDriveCore, hasLithiumFusion };
}

export function parseCrewConfiguration(
  document: IBlkDocument,
): ICapitalCrewConfiguration {
  return {
    crew: document.crew || 0,
    officers: document.officers || 0,
    gunners: document.gunners || 0,
    pilots: 2,
    marines: document.marines || 0,
    battleArmor: document.battlearmor || 0,
    passengers: document.passengers || 0,
    other: document.otherpassenger || 0,
  };
}

export function parseTransportBays(
  document: IBlkDocument,
): readonly ITransportBay[] {
  const bays: ITransportBay[] = [];
  const transporters = document.transporters || [];
  let bayNumber = 1;

  for (const transporter of transporters) {
    const parsed = parseTransporterString(transporter, bayNumber);
    if (parsed) {
      bays.push(parsed);
      bayNumber++;
    }
  }

  return bays;
}

function parseTransporterString(
  transporter: string,
  bayNumber: number,
): ITransportBay | null {
  const lower = transporter.toLowerCase();
  const parts = lower.split(':');

  if (parts.length < 2) return null;

  const typeStr = parts[0];
  const capacity = parseFloat(parts[1]) || 0;
  const doors = parts.length > 2 ? parseInt(parts[2], 10) : 1;

  let type: BayType;
  if (typeStr.includes('mech')) {
    type = BayType.MECH;
  } else if (typeStr.includes('vehicle')) {
    type = BayType.VEHICLE;
  } else if (typeStr.includes('fighter') || typeStr.includes('asf')) {
    type = BayType.FIGHTER;
  } else if (typeStr.includes('smallcraft')) {
    type = BayType.SMALL_CRAFT;
  } else if (typeStr.includes('dropship')) {
    type = BayType.CARGO;
  } else if (typeStr.includes('cargo')) {
    type = BayType.CARGO;
  } else {
    type = BayType.CARGO;
  }

  return { type, capacity, doors, bayNumber };
}

export function parseQuarters(
  document: IBlkDocument,
): readonly ICrewQuarters[] {
  const quarters: ICrewQuarters[] = [];
  const crew = document.crew || 0;
  const passengers = document.passengers || 0;

  if (crew > 0) {
    quarters.push({ type: QuartersType.CREW, capacity: crew });
  }
  if (passengers > 0) {
    quarters.push({ type: QuartersType.STEERAGE, capacity: passengers });
  }

  return quarters;
}

export function parseEquipment(
  document: IBlkDocument,
): readonly ICapitalMountedEquipment[] {
  const equipment: ICapitalMountedEquipment[] = [];
  let mountId = 0;

  for (const [locationKey, items] of Object.entries(
    document.equipmentByLocation,
  )) {
    const arc = normalizeArc(locationKey);

    for (const item of items) {
      equipment.push({
        id: `mount-${mountId++}`,
        equipmentId: item,
        name: item,
        arc,
        isCapital: isCapitalWeapon(item),
      });
    }
  }

  return equipment;
}

function normalizeArc(locationKey: string): CapitalArc {
  const normalized = locationKey.toLowerCase();
  return ARC_MAP[normalized] || CapitalArc.NOSE;
}

function isCapitalWeapon(weaponName: string): boolean {
  const lower = weaponName.toLowerCase();
  return (
    lower.includes('naval') ||
    lower.includes('capital') ||
    lower.includes('mass driver')
  );
}

export function parseNumericRaw(
  rawTags: Record<string, string | string[]>,
  key: string,
): number {
  const value = rawTags[key];
  if (Array.isArray(value)) {
    return parseFloat(value[0]) || 0;
  }
  return parseFloat(String(value)) || 0;
}

export function getBooleanFromRaw(
  rawTags: Record<string, string | string[]>,
  key: string,
): boolean {
  const value = rawTags[key];
  if (value === undefined) return false;
  if (Array.isArray(value)) {
    return value[0]?.toLowerCase() === 'true' || value[0] === '1';
  }
  return value?.toLowerCase() === 'true' || value === '1';
}
