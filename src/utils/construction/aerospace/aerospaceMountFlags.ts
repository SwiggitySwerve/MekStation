/** Native converted rear marker; preserve the large-craft input guard.
 * MegaMek 48fcb2f64, AeroBVCalculator.java:152-158; BLK equipment mount flags.
 */
export function isRearMountedAerospaceEquipment(
  id: string,
  isRearMounted?: boolean,
): boolean {
  return isRearMounted ?? id.trim().toLowerCase().startsWith('r-');
}

export function largeAerospaceMountToken(id: string): string {
  return id.trim().toLowerCase().replace(/^r-/, '').replace(/^b-/, '');
}

/** BLKFile.java:274-278,361-381 (48fcb2f64): size and ammo shots are distinct. */
export function parseLargeAerospaceMount(
  raw: string,
): { id: string; quantity?: string; size?: number } | undefined {
  const [id, kind, value, ...extra] = largeAerospaceMountToken(raw).split(':');
  if (extra.length) return undefined;
  if (kind === 'size') {
    if (
      !value ||
      !/^\d+(?:\.\d+)?$/.test(value) ||
      !Number.isFinite(Number(value))
    )
      return undefined;
    return { id, size: Number(value) };
  }
  if (value !== undefined || (kind !== undefined && !/^\d+$/.test(kind)))
    return undefined;
  return kind === undefined ? { id } : { id, quantity: kind };
}
