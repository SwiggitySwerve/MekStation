/** Compatibility identity used by the existing Mech one-shot BV reduction. */
export function isOneShotMissileBVWeapon(id: string): boolean {
  const stripped = id.toLowerCase().replace(/^\d+-/, '');
  return (
    /[- ]i-?os$/i.test(stripped) ||
    /[- ]os$/i.test(stripped) ||
    stripped.includes('one-shot')
  );
}

export function isOneShotBVWeapon(id: string): boolean {
  const wid = id.toLowerCase();
  const stripped = wid.replace(/^\d+-/, '');
  return (
    wid.includes('rocket-launcher') ||
    wid.includes('rl-') ||
    /^rl\d+$/.test(wid) ||
    stripped.includes('rocketlauncher') ||
    /^(?:is|cl)rocketlauncher\d+$/.test(stripped) ||
    /^rl\d+$/.test(stripped) ||
    isOneShotMissileBVWeapon(id)
  );
}

/** MegaMek 48fcb2f64, HeatTrackingBVCalculator.java:170-176. */
export function applyOneShotBVHeat(
  heat: number,
  ...ids: readonly string[]
): number {
  return ids.some(isOneShotBVWeapon) ? heat / 4 : heat;
}
