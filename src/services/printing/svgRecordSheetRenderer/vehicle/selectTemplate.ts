/**
 * Canonical PrintTank template selection.
 * MegaMekLab 62bf19360382049e2e6a1e8f24e859e27bdc5878,
 * PrintTank.getSVGFileName: Hydrofoil uses naval; Rail uses vehicle;
 * superheavy WiGE uses vehicle. The construction owner supplies the tier.
 * @spec openspec/changes/add-templated-vehicle-aero-proto-record-sheets/specs/record-sheet-export/spec.md
 *   (Requirement: Per-Family Record Sheet Adapters)
 */

import type { IVehicleRecordSheetData } from '@/types/printing';

import { assertSupportedVehicleTurretLayout } from '@/types/printing/RecordSheetVehicleTypes';

type TurretSegment = 'noturret' | 'turret' | 'dualturret';
type WeightSegment = 'standard' | 'superheavy';

export type VehicleTemplateKey =
  | `${'vehicle' | 'naval' | 'submarine'}_${TurretSegment}_${WeightSegment}`
  | `wige_${TurretSegment}_standard`
  | `vtol_${'noturret' | 'turret'}_standard`;

function subtypeFor(
  data: IVehicleRecordSheetData,
): 'vehicle' | 'vtol' | 'naval' | 'submarine' | 'wige' {
  switch (data.motionType) {
    case 'VTOL':
      return 'vtol';
    case 'Naval':
    case 'Hydrofoil':
      return 'naval';
    case 'Submarine':
      return 'submarine';
    case 'WiGE':
      return data.isSuperheavy ? 'vehicle' : 'wige';
    default:
      return 'vehicle';
  }
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
 * Select a pinned canonical vehicle template for either paper size.
 *
 * VTOLs use the `noturret` or `turret` key. Dual-turret VTOLs are
 * rejected because no matching canonical template is supported.
 *
 * @throws for dual-turret VTOLs: the pinned assets have no such sheet.
 */
export function selectVehicleTemplate(
  data: IVehicleRecordSheetData,
): VehicleTemplateKey {
  assertSupportedVehicleTurretLayout(data.motionType, data.turretConfig);
  const subtype = subtypeFor(data);
  const turret = turretFor(data);

  const weight =
    data.isSuperheavy && subtype !== 'vtol' ? 'superheavy' : 'standard';
  return `${subtype}_${turret}_${weight}` as VehicleTemplateKey;
}
