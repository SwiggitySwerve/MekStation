import { IBlkDocument } from '@/types/formats/BlkFormat';

import type { IJumpShip } from './JumpShipUnitHandler.types';

import {
  buildCapitalCrewConfiguration,
  parseCapitalArmorByArc,
  parseCapitalCrewQuarters,
  parseCapitalEquipment,
  parseCapitalTransportBays,
} from './capitalShipHandlerShared';

export function parseArmorByArc(armor: readonly number[]): {
  nose: number;
  frontLeftSide: number;
  frontRightSide: number;
  aftLeftSide: number;
  aftRightSide: number;
  aft: number;
} {
  return parseCapitalArmorByArc(armor);
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
): ReturnType<typeof buildCapitalCrewConfiguration> {
  return buildCapitalCrewConfiguration(document, 2);
}

export function parseTransportBays(
  document: IBlkDocument,
): ReturnType<typeof parseCapitalTransportBays> {
  return parseCapitalTransportBays(document);
}

export function parseQuarters(
  document: IBlkDocument,
): ReturnType<typeof parseCapitalCrewQuarters> {
  return parseCapitalCrewQuarters(document);
}

export function parseEquipment(
  document: IBlkDocument,
): ReturnType<typeof parseCapitalEquipment> {
  return parseCapitalEquipment(document);
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
