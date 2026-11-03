/** Vehicle armor locations in canonical record-sheet rendering order. */
export const RECORD_SHEET_VEHICLE_ARMOR_LOCATIONS = [
  'Front',
  'Left Side',
  'Right Side',
  'Rear',
  'Turret',
  'Turret 2',
  'Rotor',
  'Chin',
  'Body',
] as const;

export type RecordSheetVehicleArmorLocation =
  (typeof RECORD_SHEET_VEHICLE_ARMOR_LOCATIONS)[number];

/** Shared by the compile-time contract and the renderer boundary schema. */
export const RECORD_SHEET_VEHICLE_MOTION_TYPES = [
  'Tracked',
  'Wheeled',
  'Hover',
  'VTOL',
  'WiGE',
  'Naval',
  'Hydrofoil',
  'Submarine',
  'Rail',
] as const;

export type RecordSheetVehicleMotionType =
  (typeof RECORD_SHEET_VEHICLE_MOTION_TYPES)[number];

export type RecordSheetVehicleTurretConfig =
  | 'None'
  | 'Single'
  | 'Dual'
  | 'Front'
  | 'Rear'
  | 'Sponson';

/** Both extraction and template selection reject an unsupported turret layout. */
export function assertSupportedVehicleTurretLayout(
  motionType: RecordSheetVehicleMotionType,
  turretConfig: RecordSheetVehicleTurretConfig,
): void {
  if (motionType === 'VTOL' && turretConfig === 'Dual') {
    throw new Error(
      'Dual-turret VTOL record sheets are not supported: the pinned MegaMekLab assets have no matching template.',
    );
  }
}
