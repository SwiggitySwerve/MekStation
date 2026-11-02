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

export type RecordSheetVehicleMotionType =
  | 'Tracked'
  | 'Wheeled'
  | 'Hover'
  | 'VTOL'
  | 'WiGE'
  | 'Naval'
  | 'Submarine'
  | 'Rail';

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
    throw new Error('Dual-turret VTOL record sheets are not supported.');
  }
}
