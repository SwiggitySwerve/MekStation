/**
 * WarShip Unit Handler - Helper Functions
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ICapitalMountedEquipment,
  ITransportBay,
  ICrewQuarters,
  ICapitalCrewConfiguration,
  IGravityDeck,
  BayType,
  QuartersType,
  CapitalArc,
  KFDriveType,
} from '@/types/unit/CapitalShipInterfaces';

const ARC_MAP: Record<string, CapitalArc> = {
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

export function parseArmorByArc(armor: readonly number[]): {
  nose: number;
  frontLeftSide: number;
  frontRightSide: number;
  aftLeftSide: number;
  aftRightSide: number;
  aft: number;
  leftBroadside?: number;
  rightBroadside?: number;
} {
  return {
    nose: armor[0] || 0,
    frontLeftSide: armor[1] || 0,
    frontRightSide: armor[2] || 0,
    aftLeftSide: armor[3] || 0,
    aftRightSide: armor[4] || 0,
    aft: armor[5] || 0,
    leftBroadside: armor[6],
    rightBroadside: armor[7],
  };
}

export function parseKFDriveType(
  rawTags: Record<string, string | string[]>,
): KFDriveType {
  const driveType = getStringFromRaw(rawTags, 'kfdrivetype')?.toLowerCase();
  if (driveType === 'compact') return KFDriveType.COMPACT;
  return KFDriveType.STANDARD;
}

export function parseGravityDecks(
  rawTags: Record<string, string | string[]>,
): readonly IGravityDeck[] {
  const decks: IGravityDeck[] = [];
  const deckCount = getNumericFromRaw(rawTags, 'gravdecks') || 0;
  const largeDecks = getNumericFromRaw(rawTags, 'largegravdecks') || 0;

  for (let i = 0; i < largeDecks; i++) {
    decks.push({ size: 'Large', capacity: 200 });
  }
  for (let i = 0; i < deckCount - largeDecks; i++) {
    decks.push({ size: 'Standard', capacity: 100 });
  }

  return decks;
}

export function parseCrewConfiguration(
  document: IBlkDocument,
): ICapitalCrewConfiguration {
  return {
    crew: document.crew || 0,
    officers: document.officers || 0,
    gunners: document.gunners || 0,
    pilots: 4,
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
  if (typeStr.includes('dropship')) {
    type = BayType.DROPSHIP;
  } else if (typeStr.includes('mech')) {
    type = BayType.MECH;
  } else if (typeStr.includes('vehicle')) {
    type = BayType.VEHICLE;
  } else if (typeStr.includes('fighter') || typeStr.includes('asf')) {
    type = BayType.FIGHTER;
  } else if (typeStr.includes('smallcraft')) {
    type = BayType.SMALL_CRAFT;
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
  const officers = document.officers || 0;

  if (officers > 0) {
    quarters.push({ type: QuartersType.FIRST_CLASS, capacity: officers });
  }
  if (crew > 0) {
    quarters.push({ type: QuartersType.CREW, capacity: crew });
  }
  if (passengers > 0) {
    quarters.push({ type: QuartersType.SECOND_CLASS, capacity: passengers });
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
      const isCapital = isCapitalWeapon(item);
      equipment.push({
        id: `mount-${mountId++}`,
        equipmentId: item,
        name: item,
        arc,
        isCapital,
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
    lower.includes('mass driver') ||
    lower.includes('kraken') ||
    lower.includes('killer whale') ||
    lower.includes('white shark') ||
    lower.includes('barracuda')
  );
}

export function getStringFromRaw(
  rawTags: Record<string, string | string[]>,
  key: string,
): string | undefined {
  const value = rawTags[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getBooleanFromRaw(
  rawTags: Record<string, string | string[]>,
  key: string,
): boolean | undefined {
  const value = getStringFromRaw(rawTags, key);
  if (value === undefined) return undefined;
  return value?.toLowerCase() === 'true' || value === '1';
}

export function getNumericFromRaw(
  rawTags: Record<string, string | string[]>,
  key: string,
): number {
  const value = getStringFromRaw(rawTags, key);
  return value ? parseInt(value, 10) : 0;
}
