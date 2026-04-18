/**
 * Aerospace Record Sheet Data Extractor
 *
 * Produces `IAerospaceRecordSheetData` from an aerospace fighter / conventional
 * fighter unit configuration.
 */

import {
  IAerospaceRecordSheetData,
  IAerospaceArcArmor,
  IRecordSheetEquipment,
  IRecordSheetHeatSinks,
} from "@/types/printing";

import { extractHeader } from "./dataExtractors";

/** Aerospace-specific unit config fields. */
export interface IAerospaceUnitConfig {
  id: string;
  name: string;
  chassis: string;
  model: string;
  tonnage: number;
  techBase: string;
  rulesLevel: string;
  era: string;
  battleValue?: number;
  cost?: number;
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
    Record<IAerospaceArcArmor["arc"], { current: number; maximum: number }>
  >;
  equipment?: Array<{
    id: string;
    name: string;
    location: string;
    heat?: number;
    damage?: number | string;
    ranges?: { minimum: number; short: number; medium: number; long: number };
    isWeapon?: boolean;
    isAmmo?: boolean;
    ammoCount?: number;
  }>;
  /** Number of bomb bay slots (0 or absent when none). */
  bombBaySlots?: number;
}

/** Canonical arc order for the 4-arc armor diagram. */
const ARC_ORDER: IAerospaceArcArmor["arc"][] = [
  "Nose",
  "Left Wing",
  "Right Wing",
  "Aft",
];

/**
 * Extract aerospace record sheet data from a unit configuration.
 */
export function extractAerospaceData(
  unit: IAerospaceUnitConfig,
): IAerospaceRecordSheetData {
  const arcAlloc = unit.armorArcs ?? {};
  const armorArcs: IAerospaceArcArmor[] = ARC_ORDER.map((arc) => ({
    arc,
    current: arcAlloc[arc]?.current ?? 0,
    maximum: arcAlloc[arc]?.maximum ?? 0,
  }));

  const hsRaw = unit.heatSinks ?? { type: "Single", count: 10 };
  const isDouble = hsRaw.type.toLowerCase().includes("double");
  const heatSinks: IRecordSheetHeatSinks = {
    type: hsRaw.type,
    count: hsRaw.count,
    capacity: hsRaw.count * (isDouble ? 2 : 1),
    integrated: Math.min(hsRaw.count, 10),
    external: Math.max(0, hsRaw.count - 10),
  };

  const equipment: IRecordSheetEquipment[] = (unit.equipment ?? []).map(
    (eq, idx) => ({
      id: eq.id ?? String(idx),
      name: eq.name,
      location: eq.location,
      locationAbbr: eq.location.substring(0, 3).toUpperCase(),
      heat: eq.heat ?? "-",
      damage: eq.damage ?? "-",
      damageCode: undefined,
      minimum: eq.ranges?.minimum ?? "-",
      short: eq.ranges?.short ?? "-",
      medium: eq.ranges?.medium ?? "-",
      long: eq.ranges?.long ?? "-",
      quantity: 1,
      isWeapon: eq.isWeapon ?? false,
      isAmmo: eq.isAmmo ?? false,
      ammoCount: eq.ammoCount,
    }),
  );

  return {
    unitType: "aerospace",
    header: extractHeader(unit as Parameters<typeof extractHeader>[0]),
    structuralIntegrity: unit.structuralIntegrity ?? 0,
    fuelPoints: unit.fuelPoints ?? 400,
    safeThrust: unit.safeThrust ?? 0,
    maxThrust: unit.maxThrust ?? 0,
    heatSinks,
    armorType: unit.armorType ?? "Aerospace Standard",
    armorArcs,
    equipment,
    bombBaySlots: unit.bombBaySlots ?? 0,
    pilot: undefined,
    specialAbilities: undefined,
  };
}
