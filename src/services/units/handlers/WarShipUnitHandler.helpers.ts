/**
 * WarShip Unit Handler - Helper Functions
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  BayType,
  ICapitalCrewConfiguration,
  ICrewQuarters,
  IGravityDeck,
  ITransportBay,
  KFDriveType,
  QuartersType,
} from '@/types/unit/CapitalShipInterfaces';

import {
  DEFAULT_CAPITAL_TRANSPORT_BAY_RULES,
  parseCapitalTransporterString,
  type ITransportBayTypeRule,
} from './transportBayParsing';

const WARSHIP_TRANSPORT_BAY_RULES: readonly ITransportBayTypeRule[] = [
  { tokens: ['dropship'], type: BayType.DROPSHIP },
  ...DEFAULT_CAPITAL_TRANSPORT_BAY_RULES,
];

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
  return parseCapitalTransporterString(
    transporter,
    bayNumber,
    WARSHIP_TRANSPORT_BAY_RULES,
  );
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
