/** Vehicle armor locations in canonical record-sheet rendering order. */
export const RECORD_SHEET_VEHICLE_ARMOR_LOCATIONS = [
  'Front',
  'Left Side',
  'Right Side',
  'Rear',
  'Turret',
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
