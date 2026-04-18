/**
 * ProtoMech Record Sheet Data Extractor
 *
 * Produces `IProtoMechRecordSheetData` from a ProtoMech point unit configuration.
 */

import {
  IProtoMechRecordSheetData,
  IProtoMechUnit,
  IRecordSheetEquipment,
} from "@/types/printing";

import { extractHeader } from "./dataExtractors";

/** ProtoMech location keys. */
type ProtoLoc =
  | "Head"
  | "Torso"
  | "Left Arm"
  | "Right Arm"
  | "Legs"
  | "Main Gun";

/** ProtoMech-specific unit config fields. */
export interface IProtoMechUnitConfig {
  id: string;
  name: string;
  chassis: string;
  model: string;
  /** Tonnage per individual ProtoMech (2–9t). */
  tonnage: number;
  techBase: string;
  rulesLevel: string;
  era: string;
  battleValue?: number;
  cost?: number;
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
}

/** Default armor values per location when absent from config. */
const DEFAULT_ARMOR: Record<ProtoLoc, { current: number; maximum: number }> = {
  Head: { current: 0, maximum: 0 },
  Torso: { current: 0, maximum: 0 },
  "Left Arm": { current: 0, maximum: 0 },
  "Right Arm": { current: 0, maximum: 0 },
  Legs: { current: 0, maximum: 0 },
  "Main Gun": { current: 0, maximum: 0 },
};

/**
 * Build a fully-specified armor map for one proto, filling missing locations
 * with zero values so the renderer always has all 6 keys available.
 */
function buildArmorMap(
  raw?: Partial<Record<ProtoLoc, { current: number; maximum: number }>>,
): Record<ProtoLoc, { current: number; maximum: number }> {
  const locs: ProtoLoc[] = [
    "Head",
    "Torso",
    "Left Arm",
    "Right Arm",
    "Legs",
    "Main Gun",
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
    unitType: "protomech",
    header: extractHeader(unit as Parameters<typeof extractHeader>[0]),
    pointSize,
    protos,
    mainGun: unit.mainGun,
    mainGunAmmo: unit.mainGunAmmo,
    hasUMU: unit.hasUMU ?? false,
    isGlider: unit.isGlider ?? false,
    walkMP: unit.walkMP ?? 0,
    jumpMP: unit.jumpMP ?? 0,
    equipment,
    pilot: undefined,
  };
}
