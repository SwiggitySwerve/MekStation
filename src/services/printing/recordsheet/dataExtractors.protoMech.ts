/**
 * ProtoMech Record Sheet Data Extractor
 *
 * Produces `IProtoMechRecordSheetData` from a ProtoMech point unit configuration.
 */

import {
  IProtoMechRecordSheetData,
  IProtoMechUnit,
  IRecordSheetPilot,
} from '@/types/printing';

import type { IBaseRecordSheetUnitConfig } from './types';

import { extractHeader } from './dataExtractors';
import {
  ISimpleEquipmentInput,
  mapSimpleRecordSheetEquipment,
} from './simpleEquipmentMapper';

/** ProtoMech location keys. */
type ProtoLoc =
  | 'Head'
  | 'Torso'
  | 'Left Arm'
  | 'Right Arm'
  | 'Legs'
  | 'Main Gun';

/** ProtoMech-specific unit config fields. */
export interface IProtoMechUnitConfig extends IBaseRecordSheetUnitConfig {
  /** Tonnage per individual ProtoMech (2–9t). */
  /** Number of ProtoMechs in this point (1–5). */
  pointSize?: number;
  /** Per-proto armor data. Missing entries get synthetic defaults. */
  protos?: Array<{
    index: number;
    armorByLocation: Partial<
      Record<ProtoLoc, { current: number; maximum: number }>
    >;
  }>;
  /** Main gun designation (weapon name). */
  mainGun?: string;
  /** Remaining main gun ammo shots. */
  mainGunAmmo?: number;
  hasUMU?: boolean;
  isGlider?: boolean;
  walkMP?: number;
  jumpMP?: number;
  pilot?: IRecordSheetPilot;
  equipment?: ISimpleEquipmentInput[];
}

/** Default armor values per location when absent from config. */
const DEFAULT_ARMOR: Record<ProtoLoc, { current: number; maximum: number }> = {
  Head: { current: 0, maximum: 0 },
  Torso: { current: 0, maximum: 0 },
  'Left Arm': { current: 0, maximum: 0 },
  'Right Arm': { current: 0, maximum: 0 },
  Legs: { current: 0, maximum: 0 },
  'Main Gun': { current: 0, maximum: 0 },
};

/**
 * Build a fully-specified armor map for one proto, filling missing locations
 * with zero values so the renderer always has all 6 keys available.
 */
function buildArmorMap(
  raw?: Partial<Record<ProtoLoc, { current: number; maximum: number }>>,
): Record<ProtoLoc, { current: number; maximum: number }> {
  const locs: ProtoLoc[] = [
    'Head',
    'Torso',
    'Left Arm',
    'Right Arm',
    'Legs',
    'Main Gun',
  ];
  const result = {} as Record<ProtoLoc, { current: number; maximum: number }>;
  for (const loc of locs) {
    result[loc] = raw?.[loc] ?? DEFAULT_ARMOR[loc];
  }
  return result;
}

/**
 * Extract ProtoMech record sheet data from a point configuration.
 */
export function extractProtoMechData(
  unit: IProtoMechUnitConfig,
): IProtoMechRecordSheetData {
  const pointSize = Math.min(Math.max(unit.pointSize ?? 1, 1), 5);

  // Build proto entries — synthesise missing ones
  const rawProtos = unit.protos ?? [];
  const protos: IProtoMechUnit[] = Array.from({ length: pointSize }, (_, i) => {
    const raw = rawProtos[i];
    return {
      index: i + 1,
      armorByLocation: buildArmorMap(raw?.armorByLocation),
    };
  });

  return {
    unitType: 'protomech',
    header: extractHeader(unit),
    pointSize,
    protos,
    mainGun: unit.mainGun,
    mainGunAmmo: unit.mainGunAmmo,
    hasUMU: unit.hasUMU ?? false,
    isGlider: unit.isGlider ?? false,
    walkMP: unit.walkMP ?? 0,
    jumpMP: unit.jumpMP ?? 0,
    equipment: mapSimpleRecordSheetEquipment(unit.equipment),
    pilot: unit.pilot,
  };
}
