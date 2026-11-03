/**
 * Aerospace Record Sheet Data Extractor
 *
 * Produces `IAerospaceRecordSheetData` from an aerospace fighter / conventional
 * fighter unit configuration.
 */

import { mapHeatSinkType } from '@/services/conversion/ValueMappings';
import {
  IAerospaceRecordSheetData,
  IAerospaceArcArmor,
  IRecordSheetHeatSinks,
  IRecordSheetPilot,
  IRecordSheetSPAEntry,
} from '@/types/printing';
import { calculateHeatDissipation } from '@/utils/construction/heatSinkCalculations';

import type { IBaseRecordSheetUnitConfig } from './types';

import { extractHeader } from './dataExtractors';
import {
  ISimpleEquipmentInput,
  mapSimpleRecordSheetEquipment,
} from './simpleEquipmentMapper';

/** Aerospace-specific unit config fields. */
export interface IAerospaceUnitConfig extends IBaseRecordSheetUnitConfig {
  isConventional?: boolean;
  /** Structural Integrity points. */
  structuralIntegrity?: number;
  /** Total fuel points (standard aerospace: 400). */
  fuelPoints?: number;
  /** Safe Thrust rating (2/3 of max, rounded up). */
  safeThrust?: number;
  /** Maximum Thrust rating. */
  maxThrust?: number;
  heatSinks?: { type: string; count: number };
  armorType?: string;
  /** Armor per arc. Missing arcs default to 0/0. */
  armorArcs?: Partial<
    Record<IAerospaceArcArmor['arc'], { current: number; maximum: number }>
  >;
  equipment?: ISimpleEquipmentInput[];
  /** Number of bomb bay slots (0 or absent when none). */
  bombBaySlots?: number;
  pilot?: IRecordSheetPilot;
}

/** Canonical arc order for the 4-arc armor diagram. */
const ARC_ORDER: IAerospaceArcArmor['arc'][] = [
  'Nose',
  'Left Wing',
  'Right Wing',
  'Aft',
];

/**
 * Extract aerospace record sheet data from a unit configuration.
 */
export function extractAerospaceData(
  unit: IAerospaceUnitConfig,
  specialAbilities?: readonly IRecordSheetSPAEntry[],
): IAerospaceRecordSheetData {
  const arcAlloc = unit.armorArcs ?? {};
  const armorArcs: IAerospaceArcArmor[] = ARC_ORDER.map((arc) => ({
    arc,
    current: arcAlloc[arc]?.current ?? 0,
    maximum: arcAlloc[arc]?.maximum ?? 0,
  }));

  const hsRaw = unit.heatSinks ?? { type: 'Single', count: 10 };
  const heatSinks: IRecordSheetHeatSinks = {
    type: hsRaw.type,
    count: hsRaw.count,
    capacity: calculateHeatDissipation(
      mapHeatSinkType(hsRaw.type),
      hsRaw.count,
    ),
    integrated: Math.min(hsRaw.count, 10),
    external: Math.max(0, hsRaw.count - 10),
  };

  return {
    unitType: 'aerospace',
    isConventional: unit.isConventional ?? false,
    header: extractHeader(unit),
    structuralIntegrity: unit.structuralIntegrity ?? 0,
    fuelPoints: unit.fuelPoints ?? 400,
    safeThrust: unit.safeThrust ?? 0,
    maxThrust: unit.maxThrust ?? 0,
    heatSinks,
    armorType: unit.armorType ?? 'Aerospace Standard',
    armorArcs,
    equipment: mapSimpleRecordSheetEquipment(unit.equipment),
    bombBaySlots: unit.bombBaySlots ?? 0,
    pilot: unit.pilot,
    specialAbilities,
  };
}
