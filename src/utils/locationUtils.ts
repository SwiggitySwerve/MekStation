const LOCATION_SHORTCUTS: Record<string, string> = {
  'Head': 'HD',
  'Center Torso': 'CT',
  'Left Torso': 'LT',
  'Right Torso': 'RT',
  'Left Arm': 'LA',
  'Right Arm': 'RA',
  'Left Leg': 'LL',
  'Right Leg': 'RL',
  'Front Left Leg': 'FLL',
  'Front Right Leg': 'FRL',
  'Rear Left Leg': 'RLL',
  'Rear Right Leg': 'RRL',
};

export function getLocationShorthand(location: string): string {
  return LOCATION_SHORTCUTS[location] || location;
}

export function getLocationFullName(shorthand: string): string {
  const entry = Object.entries(LOCATION_SHORTCUTS).find(([, abbr]) => abbr === shorthand);
  return entry ? entry[0] : shorthand;
}
