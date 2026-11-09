/**
 * Space Station Unit Handler - Helper Functions
 *
 * Extracted helper methods for parsing and data transformation.
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ICapitalCrewConfiguration,
  ICrewQuarters,
  ITransportBay,
  QuartersType,
} from '@/types/unit/CapitalShipInterfaces';

import { SpaceStationType } from './SpaceStationUnitHandler.types';
import { parseCapitalTransporterString } from './transportBayParsing';

/**
 * Parse station type from raw tags
 */
export function parseStationType(
  rawTags: Record<string, string | string[]>,
): SpaceStationType {
  const typeStr = getStringFromRaw(rawTags, 'stationtype')?.toLowerCase() || '';

  if (typeStr.includes('shipyard')) return SpaceStationType.SHIPYARD;
  if (typeStr.includes('recharge')) return SpaceStationType.RECHARGE_STATION;
  if (typeStr.includes('habitat')) return SpaceStationType.HABITAT;
  if (typeStr.includes('military') || typeStr.includes('defense'))
    return SpaceStationType.MILITARY;
  if (typeStr.includes('deep')) return SpaceStationType.DEEP_SPACE;

  return SpaceStationType.ORBITAL;
}

/**
 * Parse crew configuration
 */
export function parseCrewConfiguration(
  document: IBlkDocument,
): ICapitalCrewConfiguration {
  return {
    crew: document.crew || 0,
    officers: document.officers || 0,
    gunners: document.gunners || 0,
    pilots: 0, // Stations don't have pilots
    marines: document.marines || 0,
    battleArmor: document.battlearmor || 0,
    passengers: document.passengers || 0,
    other: document.otherpassenger || 0,
  };
}

/**
 * Parse transport bays
 */
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

/**
 * Parse a transporter string into ITransportBay
 */
function parseTransporterString(
  transporter: string,
  bayNumber: number,
): ITransportBay | null {
  return parseCapitalTransporterString(transporter, bayNumber);
}

/**
 * Parse crew quarters
 */
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

/**
 * Get string from raw tags
 */
export function getStringFromRaw(
  rawTags: Record<string, string | string[]>,
  key: string,
): string | undefined {
  const value = rawTags[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

/**
 * Parse numeric value from raw tags
 */
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

/**
 * Get boolean value from raw tags
 */
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
