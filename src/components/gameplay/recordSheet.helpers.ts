export const LOCATION_ORDER = [
  'head',
  'center_torso',
  'left_torso',
  'right_torso',
  'left_arm',
  'right_arm',
  'left_leg',
  'right_leg',
];

export const LOCATION_NAMES: Record<string, string> = {
  head: 'Head',
  center_torso: 'Center Torso',
  left_torso: 'Left Torso',
  right_torso: 'Right Torso',
  left_arm: 'Left Arm',
  right_arm: 'Right Arm',
  left_leg: 'Left Leg',
  right_leg: 'Right Leg',
};

export const REAR_ARMOR_LOCATIONS = [
  'center_torso',
  'left_torso',
  'right_torso',
];

/**
 * @internal Reserved for future damage visualization
 */
export function _getDamagePercent(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.round((1 - current / max) * 100);
}

export function getStatusColor(remaining: number, max: number): string {
  const percent = max > 0 ? (remaining / max) * 100 : 0;
  if (percent === 0) return 'text-text-theme-secondary';
  if (percent <= 25) return 'text-red-600';
  if (percent <= 50) return 'text-orange-500';
  if (percent <= 75) return 'text-yellow-600';
  return 'text-green-600';
}
