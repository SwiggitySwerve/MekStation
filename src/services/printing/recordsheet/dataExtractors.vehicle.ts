/**
 * Vehicle Record Sheet Data Extractor
 *
 * Produces `IVehicleRecordSheetData` from a vehicle unit configuration.
 * The unit config shape is the same `IUnitConfig` used by the mech extractor,
 * extended with vehicle-specific optional fields that callers populate.
 */

import {
  IVehicleRecordSheetData,
  IVehicleCrewMember,
  IVehicleLocationArmor,
  IRecordSheetEquipment,
  IRecordSheetSPAEntry,
  RecordSheetVehicleMotionType,
  RecordSheetVehicleTurretConfig,
} from '@/types/printing';

import { extractHeader } from './dataExtractors';

/**
 * Vehicle-specific fields augmenting the base `IUnitConfig`.
 * Callers cast their unit object to this before calling the extractor.
 */
export interface IVehicleUnitConfig {
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
  /** Combat vehicle motion type — defaults to 'Tracked' when absent. */
  motionType?: RecordSheetVehicleMotionType;
  /** Turret layout — defaults to Single when turret armor/equipment exists. */
  turretConfig?: RecordSheetVehicleTurretConfig;
  /** Cruise MP (walk equivalent). */
  cruiseMP?: number;
  /** Flank MP (run equivalent). */
  flankMP?: number;
  armorType?: string;
  /** Armor allocation keyed by location string. */
  armorAllocation?: Record<
    string,
    { current: number; maximum: number; bar?: number }
  >;
  crew?: Array<{
    role: 'driver' | 'gunner' | 'commander';
    name?: string;
    gunnery: number;
    piloting: number;
    specialAbilities?: readonly IRecordSheetSPAEntry[];
  }>;
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
  barRating?: number;
}

/** Standard vehicle armor location order for consistent rendering. */
const VEHICLE_LOCATION_ORDER: IVehicleLocationArmor['location'][] = [
  'Front',
  'Left Side',
  'Right Side',
  'Rear',
  'Turret',
  'Rotor',
  'Chin',
  'Body',
];

function inferTurretConfig(
  unit: IVehicleUnitConfig,
): RecordSheetVehicleTurretConfig {
  if (unit.turretConfig) return unit.turretConfig;
  const hasTurretArmor = unit.armorAllocation?.Turret !== undefined;
  const hasTurretEquipment = (unit.equipment ?? []).some((eq) =>
    eq.location.toLowerCase().includes('turret'),
  );
  return hasTurretArmor || hasTurretEquipment ? 'Single' : 'None';
}

/**
 * Extract vehicle record sheet data from a vehicle unit configuration.
 *
 * All fields have safe defaults so a partially-populated config still
 * produces a renderable sheet (with zeros where data is missing).
 */
export function extractVehicleData(
  unit: IVehicleUnitConfig,
  specialAbilities?: readonly IRecordSheetSPAEntry[],
): IVehicleRecordSheetData {
  // Build armor locations in canonical order, skipping absent locations
  const armorAlloc = unit.armorAllocation ?? {};
  const armorLocations: IVehicleLocationArmor[] = VEHICLE_LOCATION_ORDER.filter(
    (loc) => armorAlloc[loc] !== undefined,
  ).map((loc) => ({
    location: loc,
    current: armorAlloc[loc]?.current ?? 0,
    maximum: armorAlloc[loc]?.maximum ?? 0,
    bar: armorAlloc[loc]?.bar,
  }));

  // If no allocation provided, emit a placeholder Front location so the
  // renderer always has at least one bar to draw.
  if (armorLocations.length === 0) {
    armorLocations.push({ location: 'Front', current: 0, maximum: 0 });
  }

  // Crew — default to a single driver when not specified
  const crew: IVehicleCrewMember[] = (
    unit.crew ?? [{ role: 'driver', gunnery: 4, piloting: 5 }]
  ).map((c) => ({
    role: c.role,
    name: c.name,
    gunnery: c.gunnery,
    piloting: c.piloting,
    specialAbilities: c.specialAbilities,
  }));

  // Equipment — map to the shared IRecordSheetEquipment shape
  const equipment: IRecordSheetEquipment[] = (unit.equipment ?? []).map(
    (eq, idx) => ({
      id: eq.id ?? String(idx),
      name: eq.name,
      location: eq.location,
      locationAbbr: eq.location.substring(0, 3).toUpperCase(),
      heat: eq.heat ?? '-',
      damage: eq.damage ?? '-',
      damageCode: undefined,
      minimum: eq.ranges?.minimum ?? '-',
      short: eq.ranges?.short ?? '-',
      medium: eq.ranges?.medium ?? '-',
      long: eq.ranges?.long ?? '-',
      quantity: 1,
      isWeapon: eq.isWeapon ?? false,
      isAmmo: eq.isAmmo ?? false,
      ammoCount: eq.ammoCount,
    }),
  );

  return {
    unitType: 'vehicle',
    header: extractHeader(unit),
    motionType: unit.motionType ?? 'Tracked',
    turretConfig: inferTurretConfig(unit),
    cruiseMP: unit.cruiseMP ?? 0,
    flankMP: unit.flankMP ?? 0,
    armorType: unit.armorType ?? 'Standard',
    armorLocations,
    crew,
    equipment,
    barRating: unit.barRating,
    pilot: undefined,
    specialAbilities,
  };
}
