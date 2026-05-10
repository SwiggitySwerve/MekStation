export const DEFAULT_WEAPON_FILES = [
  'weapons/energy-laser.json',
  'weapons/energy-ppc.json',
  'weapons/energy-other.json',
  'weapons/ballistic-autocannon.json',
  'weapons/ballistic-gauss.json',
  'weapons/ballistic-machinegun.json',
  'weapons/ballistic-other.json',
  'weapons/missile-atm.json',
  'weapons/missile-lrm.json',
  'weapons/missile-mrm.json',
  'weapons/missile-other.json',
  'weapons/missile-srm.json',
  'weapons/physical.json',
];

export const DEFAULT_AMMUNITION_FILES = [
  'ammunition/artillery.json',
  'ammunition/atm.json',
  'ammunition/autocannon.json',
  'ammunition/gauss.json',
  'ammunition/lrm.json',
  'ammunition/machinegun.json',
  'ammunition/mrm.json',
  'ammunition/narc.json',
  'ammunition/other.json',
  'ammunition/srm.json',
];

export const DEFAULT_ELECTRONICS_FILES = [
  'electronics/ecm.json',
  'electronics/active-probe.json',
  'electronics/c3.json',
  'electronics/other.json',
];

export const DEFAULT_MISC_FILES = [
  'miscellaneous/heat-sinks.json',
  'miscellaneous/jump-jets.json',
  'miscellaneous/movement.json',
  'miscellaneous/myomer.json',
  'miscellaneous/defensive.json',
  'miscellaneous/other.json',
];

export function getIndexedFileList(
  entry: Record<string, string> | string | undefined,
  fallback: readonly string[],
): string[] {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return Object.values(entry);
  }
  return [...fallback];
}
