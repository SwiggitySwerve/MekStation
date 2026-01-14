import { MechLocation } from '@/types/construction';

export const LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
};

export const QUAD_LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.FRONT_LEFT_LEG]: 'FLL',
  [MechLocation.FRONT_RIGHT_LEG]: 'FRL',
  [MechLocation.REAR_LEFT_LEG]: 'RLL',
  [MechLocation.REAR_RIGHT_LEG]: 'RRL',
};

export const FIGHTER_LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.NOSE]: 'NOS',
  [MechLocation.FUSELAGE]: 'FUS',
  [MechLocation.LEFT_WING]: 'LW',
  [MechLocation.RIGHT_WING]: 'RW',
  [MechLocation.AFT]: 'AFT',
};

export const TRIPOD_LOCATION_LABELS: Partial<Record<MechLocation, string>> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
  [MechLocation.CENTER_LEG]: 'CL',
};
