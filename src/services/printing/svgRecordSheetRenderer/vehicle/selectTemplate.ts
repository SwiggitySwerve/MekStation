/**
 * Vehicle / VTOL family — canonical template selection.
 *
 * Pure function mapping an `IVehicleRecordSheetData` to a Wave-1
 * `templateKey`, mirroring MegaMekLab `PrintTank.getSVGFileName()`:
 * the key has the form `{subtype}_{turret}_{weight}`.
 *
 * Wave-1 scope: only the `vehicle` and `vtol` subtypes at the
 * `standard` weight tier. Naval / submarine / WiGE / superheavy are
 * out of scope and rejected with a clear error so a mis-routed unit
 * fails loudly rather than rendering the wrong sheet.
 *
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters — vehicle/VTOL keys)
 */

import type { IVehicleRecordSheetData } from '@/types/printing';

/** The five Wave-1 vehicle / VTOL template keys. */
export type VehicleTemplateKey =
  | 'vehicle_noturret_standard'
  | 'vehicle_turret_standard'
  | 'vehicle_dualturret_standard'
  | 'vtol_noturret_standard'
  | 'vtol_turret_standard';

/**
 * Map a vehicle's motion type to the template subtype segment.
 * Wave-1 supports `vehicle` (ground) and `vtol` only.
 */
function subtypeFor(data: IVehicleRecordSheetData): 'vehicle' | 'vtol' {
  if (data.motionType === 'VTOL') {
    return 'vtol';
  }
  // Tracked / Wheeled / Hover all render on the ground-vehicle template.
  // Naval / Submarine / WiGE / Rail are out of Wave-1 scope.
  if (
    data.motionType === 'Naval' ||
    data.motionType === 'Submarine' ||
    data.motionType === 'WiGE' ||
    data.motionType === 'Rail'
  ) {
    throw new Error(
      `Vehicle motion type "${data.motionType}" is not in Wave-1 scope ` +
        `(only Tracked / Wheeled / Hover / VTOL are templated).`,
    );
  }
  return 'vehicle';
}

/**
 * Map a vehicle's turret configuration to the template turret segment,
 * following `PrintTank`: no turret → `noturret`; a single turret →
 * `turret`; a dual turret → `dualturret`.
 *
 * `Front` / `Rear` / `Sponson` configs are treated as single-turret
 * for record-sheet layout (they render in the `turret` template's
 * turret block) — `PrintTank` likewise collapses them via
 * `hasNoDualTurret()`.
 */
function turretFor(
  data: IVehicleRecordSheetData,
): 'noturret' | 'turret' | 'dualturret' {
  switch (data.turretConfig) {
    case 'None':
      return 'noturret';
    case 'Dual':
      return 'dualturret';
    case 'Single':
    case 'Front':
    case 'Rear':
    case 'Sponson':
      return 'turret';
    default:
      return 'noturret';
  }
}

/**
 * Select the canonical Wave-1 template key for a vehicle / VTOL unit.
 *
 * VTOLs always use the `noturret` or `turret` key — there is no
 * `vtol_dualturret` template; a dual-turret VTOL (rare) collapses to
 * the single-turret VTOL sheet.
 *
 * @throws when the unit's motion type is outside Wave-1 scope.
 */
export function selectVehicleTemplate(
  data: IVehicleRecordSheetData,
): VehicleTemplateKey {
  const subtype = subtypeFor(data);
  let turret = turretFor(data);

  // No `vtol_dualturret_standard` template exists — collapse to turret.
  if (subtype === 'vtol' && turret === 'dualturret') {
    turret = 'turret';
  }

  // Weight tier is always `standard` for Wave-1 (superheavy excluded).
  return `${subtype}_${turret}_standard` as VehicleTemplateKey;
}
