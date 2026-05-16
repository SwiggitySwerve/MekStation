/**
 * Vehicle / VTOL family — template bindings.
 *
 * Pure function mapping an `IVehicleRecordSheetData` to the
 * `{ texts, pips }` structure consumed by `TemplateRecordSheetRenderer`.
 * Text targets are keyed against the Phase-0 `VEHICLE_TEMPLATE_IDS`
 * catalog; pip groups carry a typed `PipCounts` contract computed
 * directly from the unit's armor statistics.
 *
 * No I/O, no DOM, no asset access — a deterministic pure function.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import type { IVehicleRecordSheetData } from '@/types/printing';

import type { PipFill, TextBindings } from '../templateRecordSheetRenderer';

import { VEHICLE_TEMPLATE_IDS } from '../templateElementIds';

/**
 * Per-location armor pip counts for a vehicle / VTOL.
 *
 * Keys are the canonical template location codes (FR / LS / RS / RR /
 * TU / FT / RO). A value is present only when the unit actually has
 * that location with non-zero armor.
 */
export interface VehiclePipCounts {
  /** Front armor points. */
  readonly FR?: number;
  /** Left-side armor points. */
  readonly LS?: number;
  /** Right-side armor points. */
  readonly RS?: number;
  /** Rear armor points. */
  readonly RR?: number;
  /** Turret armor points (turret-equipped vehicles). */
  readonly TU?: number;
  /** Front-turret armor points (dual-turret vehicles). */
  readonly FT?: number;
  /** Rotor armor points (VTOLs). */
  readonly RO?: number;
}

/** The result of binding a vehicle to its canonical template. */
export interface VehicleBindings {
  /** Text injections keyed by template element ID. */
  readonly texts: TextBindings;
  /** Pip-group fills keyed by template pip-group element ID. */
  readonly pips: readonly PipFill[];
  /** Typed per-location pip counts (the fidelity-gate contract). */
  readonly pipCounts: VehiclePipCounts;
}

/**
 * Map an `IVehicleLocationArmor.location` string to the canonical
 * template location code. `Chin` armor renders in the turret block;
 * `Body` has no armor diagram region (internal-only).
 */
const LOCATION_TO_CODE: Record<string, keyof VehiclePipCounts | null> = {
  Front: 'FR',
  'Left Side': 'LS',
  'Right Side': 'RS',
  Rear: 'RR',
  Turret: 'TU',
  Rotor: 'RO',
  Chin: 'TU',
  Body: null,
};

/** Template armor pip-group element ID per location code. */
const ARMOR_PIP_GROUP: Record<keyof VehiclePipCounts, string> = {
  FR: VEHICLE_TEMPLATE_IDS.armorPipsFR,
  LS: VEHICLE_TEMPLATE_IDS.armorPipsLS,
  RS: VEHICLE_TEMPLATE_IDS.armorPipsRS,
  RR: VEHICLE_TEMPLATE_IDS.armorPipsRR,
  TU: VEHICLE_TEMPLATE_IDS.armorPipsTU,
  FT: VEHICLE_TEMPLATE_IDS.armorPipsFT,
  RO: VEHICLE_TEMPLATE_IDS.armorPipsRO,
};

/** Template armor value-text element ID per location code. */
const ARMOR_TEXT: Record<keyof VehiclePipCounts, string> = {
  FR: VEHICLE_TEMPLATE_IDS.textArmor_FR,
  LS: VEHICLE_TEMPLATE_IDS.textArmor_LS,
  RS: VEHICLE_TEMPLATE_IDS.textArmor_RS,
  RR: VEHICLE_TEMPLATE_IDS.textArmor_RR,
  TU: VEHICLE_TEMPLATE_IDS.textArmor_TU,
  FT: VEHICLE_TEMPLATE_IDS.textArmor_FT,
  RO: VEHICLE_TEMPLATE_IDS.textArmor_RO,
};

/**
 * Compute the per-location armor pip counts for a vehicle.
 *
 * Each entry's count equals the unit's `current` armor point value for
 * that location — the fidelity gate asserts the rendered pip-element
 * count matches this exactly.
 */
export function computeVehiclePipCounts(
  data: IVehicleRecordSheetData,
): VehiclePipCounts {
  const counts: Record<string, number> = {};
  for (const loc of data.armorLocations) {
    const code = LOCATION_TO_CODE[loc.location];
    if (code && loc.current > 0) {
      // A second turret location maps to FT only when a dual turret is
      // configured; otherwise both turret entries (if any) sum into TU.
      counts[code] = (counts[code] ?? 0) + loc.current;
    }
  }
  // Dual-turret units expose the front turret separately as FT.
  if (data.turretConfig === 'Dual') {
    const turrets = data.armorLocations.filter((l) => l.location === 'Turret');
    if (turrets.length >= 2) {
      counts.TU = turrets[0].current;
      counts.FT = turrets[1].current;
    }
  }
  return counts as VehiclePipCounts;
}

/**
 * Bind a vehicle / VTOL unit to its canonical template.
 *
 * Produces header / movement / crew text injections and the per-arc
 * armor pip fills. Only catalogued template IDs are referenced.
 */
export function bindVehicle(data: IVehicleRecordSheetData): VehicleBindings {
  const { header } = data;
  const pipCounts = computeVehiclePipCounts(data);

  // --- Text bindings (catalogued IDs only) ---
  const texts: Record<string, string> = {
    [VEHICLE_TEMPLATE_IDS.type]: `${header.chassis} ${header.model}`,
    [VEHICLE_TEMPLATE_IDS.tonnage]: String(header.tonnage),
    [VEHICLE_TEMPLATE_IDS.techBase]: header.techBase,
    [VEHICLE_TEMPLATE_IDS.rulesLevel]: header.rulesLevel,
    [VEHICLE_TEMPLATE_IDS.role]: header.role ?? '',
    [VEHICLE_TEMPLATE_IDS.bv]: header.battleValue.toLocaleString(),
    [VEHICLE_TEMPLATE_IDS.armorType]: data.armorType,
    [VEHICLE_TEMPLATE_IDS.movementType]: data.motionType,
    [VEHICLE_TEMPLATE_IDS.mpWalk]: String(data.cruiseMP),
    [VEHICLE_TEMPLATE_IDS.mpRun]: String(data.flankMP),
  };

  // Crew skills — bind the first driver/gunner found.
  const gunner = data.crew.find((c) => c.role === 'gunner') ?? data.crew[0];
  const driver = data.crew.find((c) => c.role === 'driver') ?? data.crew[0];
  if (gunner) {
    texts[VEHICLE_TEMPLATE_IDS.gunnerySkill0] = String(gunner.gunnery);
  }
  if (driver) {
    texts[VEHICLE_TEMPLATE_IDS.pilotingSkill0] = String(driver.piloting);
  }

  // Armor value-text labels per location.
  for (const [code, count] of Object.entries(pipCounts)) {
    const textId = ARMOR_TEXT[code as keyof VehiclePipCounts];
    if (textId) {
      texts[textId] = String(count);
    }
  }

  // --- Pip fills — one per armed location ---
  const pips: PipFill[] = [];
  for (const [code, count] of Object.entries(pipCounts)) {
    const groupId = ARMOR_PIP_GROUP[code as keyof VehiclePipCounts];
    if (groupId && count > 0) {
      pips.push({ groupId, count, className: 'pip armor' });
    }
  }

  return { texts, pips, pipCounts };
}
