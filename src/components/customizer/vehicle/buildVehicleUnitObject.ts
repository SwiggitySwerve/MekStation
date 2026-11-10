/**
 * buildVehicleUnitObject — vehicle store → record-sheet unit object
 *
 * Pure builder that maps the vehicle store's fields onto the
 * `IVehicleRecordSheetUnitInput` shape consumed by
 * `RecordSheetService.extractData`. The returned object carries a `unitType`
 * hint that `dispatchTargetFromUnit` resolves to the `'vehicle'` dispatch kind.
 *
 * Extracted from `VehiclePreviewTab` so the builder can be unit-tested
 * independently of React rendering.
 *
 * @spec openspec/changes/wire-non-mech-customizer-preview/specs/record-sheet-export/spec.md
 *        Requirement: Customizer Non-Mech Preview And Export Path
 */

import type { IVehicleRecordSheetUnitInput } from '@/services/printing/recordsheet/dispatchTarget';
import type {
  IVehicleArmorAllocation,
  IVTOLArmorAllocation,
} from '@/stores/vehicleState';
import type {
  IVehicleMountedEquipment,
  ITurretConfiguration,
} from '@/types/unit/VehicleInterfaces';

import { getVehicleEquipmentLocationAbbr } from '@/services/printing/recordsheet/equipmentLocations';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';
import {
  getVehicleArmorEditorLayout,
  type IVehicleArmorProfile,
} from '@/utils/construction/vehicle/editorArmor';
import { VehicleStructureType } from '@/utils/construction/vehicle/structure';
import { getInstalledVehicleTurretType } from '@/utils/construction/vehicle/turret';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';

import {
  buildRecordSheetUnitIdentity,
  type RecordSheetUnitIdentityWithTonnageInput,
} from '../preview/recordSheetUnitIdentity';

/** Store fields the vehicle unit-object builder reads. */
export interface VehicleUnitObjectInput extends RecordSheetUnitIdentityWithTonnageInput {
  unitType: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE;
  motionType: GroundMotionType;
  isSuperheavy?: boolean;
  structureType?: string;
  hasEnvironmentalSealing?: boolean;
  hasFlotationHull?: boolean;
  cruiseMP: number;
  flankMP: number;
  armorType: ArmorTypeEnum;
  armorAllocation: IVehicleArmorAllocation | IVTOLArmorAllocation;
  usesBarArmor?: boolean;
  barRating: number | null;
  equipment: readonly IVehicleMountedEquipment[];
  turret: ITurretConfiguration | null;
  secondaryTurret: ITurretConfiguration | null;
}

const TURRET_LABEL: Record<
  TurretType,
  NonNullable<IVehicleRecordSheetUnitInput['turretConfig']>
> = {
  [TurretType.NONE]: 'None',
  [TurretType.SINGLE]: 'Single',
  [TurretType.DUAL]: 'Dual',
  [TurretType.CHIN]: 'Single',
  [TurretType.SPONSON_LEFT]: 'Sponson',
  [TurretType.SPONSON_RIGHT]: 'Sponson',
};

/**
 * Map a `GroundMotionType` to the record-sheet vehicle motion label.
 * The extractor accepts a small closed set; everything else falls back to
 * 'Tracked' (the extractor's own default).
 */
function toMotionLabel(
  motionType: GroundMotionType,
): IVehicleRecordSheetUnitInput['motionType'] {
  switch (motionType) {
    case GroundMotionType.WHEELED:
      return 'Wheeled';
    case GroundMotionType.HOVER:
      return 'Hover';
    case GroundMotionType.VTOL:
      return 'VTOL';
    case GroundMotionType.NAVAL:
      return 'Naval';
    case GroundMotionType.HYDROFOIL:
      return 'Hydrofoil';
    case GroundMotionType.SUBMARINE:
      return 'Submarine';
    case GroundMotionType.RAIL:
      return 'Rail';
    case GroundMotionType.WIGE:
      return 'WiGE';
    case GroundMotionType.TRACKED:
    default:
      return 'Tracked';
  }
}

/**
 * Location enum string → record-sheet label for every location the editor
 * layout can produce. `Body` is absent on purpose: see `toArmorAllocation`.
 */
const LOCATION_LABEL: Record<string, string> = {
  Front: 'Front',
  Left: 'Left Side',
  Right: 'Right Side',
  'Front Left': 'Front Left',
  'Front Right': 'Front Right',
  'Rear Left': 'Rear Left',
  'Rear Right': 'Rear Right',
  Rear: 'Rear',
  Turret: 'Turret',
  'Turret 2': 'Turret 2',
  Rotor: 'Rotor',
};

/**
 * Translate the store's keyed armor allocation into the record-sheet
 * `{ location: { current } }` map for exactly the unit's real armor layout.
 *
 * The layout comes from the editor's layout owner (six-side only when
 * superheavy and not a VTOL, turrets only when installed, rotor only on VTOLs),
 * not from which store keys exist: the store seeds every location at 0, and a
 * real location may legitimately carry 0 armor. `Body` is never printed: every
 * pinned vehicle loader fixes Body armor at 0 (`fullArmor[0] = 0` in
 * BLKTankFile.java:196-200, BLKSupportTankFile.java:129-134,
 * BLKLargeSupportTankFile.java:132-137 and BLKSupportVTOLFile.java:127-132) and
 * `Tank.autoSetInternal` gives it no structure (Tank.java:1611).
 *
 * No `maximum`: MegaMek and MML cap only the unit total and the VTOL rotor, so
 * echoing `current` would print a fabricated cap on the skeleton fallback.
 */
function toArmorAllocation(
  allocation: IVehicleArmorAllocation | IVTOLArmorAllocation,
  profile: IVehicleArmorProfile,
): Record<string, { current: number }> {
  const points: Record<string, number | undefined> = { ...allocation };
  const result: Record<string, { current: number }> = {};
  for (const { location } of getVehicleArmorEditorLayout(profile).locations) {
    if (location === VehicleLocation.BODY) continue;
    result[LOCATION_LABEL[location]] = { current: points[location] ?? 0 };
  }
  return result;
}

/**
 * Build the discriminated vehicle unit object for the record-sheet service.
 *
 * The `unitType` field is the dispatch hint: it carries the store's exact
 * `UnitType` ('Vehicle' / 'VTOL' / 'Support Vehicle'), all of which
 * `getRecordSheetDispatchKind` normalizes to the `'vehicle'` kind.
 */
export function buildVehicleUnitObject(
  input: VehicleUnitObjectInput,
): IVehicleRecordSheetUnitInput {
  const turretType = getInstalledVehicleTurretType(
    input.turret,
    input.secondaryTurret,
  );
  return {
    ...buildRecordSheetUnitIdentity(input),
    battleValue: computeVehicleBVFromState({
      ...input,
      armorAllocation: { ...input.armorAllocation },
      structureType: input.structureType ?? VehicleStructureType.STANDARD,
    }).final,
    // Dispatch hint — resolves to the 'vehicle' kind for all three sub-types.
    unitType: input.unitType,
    motionType: toMotionLabel(input.motionType),
    isSuperheavy: input.isSuperheavy ?? false,
    turretConfig: TURRET_LABEL[turretType],
    cruiseMP: input.cruiseMP,
    flankMP: input.flankMP,
    armorType: String(input.armorType),
    armorAllocation: toArmorAllocation(input.armorAllocation, {
      hasTurret: turretType !== TurretType.NONE,
      hasSecondaryTurret: turretType === TurretType.DUAL,
      isVTOL: input.motionType === GroundMotionType.VTOL,
      isSuperheavy: input.isSuperheavy,
      isSupport: input.unitType === UnitType.SUPPORT_VEHICLE,
      isChinTurret: turretType === TurretType.CHIN,
      motionType: input.motionType,
    }),
    // The store keeps `barRating` after the armor changes away from BAR (and a
    // new support vehicle starts at 7), so only `usesBarArmor` says it applies.
    barRating: input.usesBarArmor ? (input.barRating ?? undefined) : undefined,
    equipment: input.equipment.map((eq) => ({
      id: eq.id,
      equipmentId: eq.equipmentId,
      isAmmo: eq.isAmmo,
      name: eq.name,
      location: String(eq.location),
      locationAbbr: getVehicleEquipmentLocationAbbr(
        String(eq.location),
        turretType === TurretType.DUAL,
      ),
    })),
  };
}
