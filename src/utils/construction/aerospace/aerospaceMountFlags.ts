/** Native converted rear marker; preserve the large-craft input guard.
 * MegaMek 48fcb2f64, AeroBVCalculator.java:152-158; BLK equipment mount flags.
 */
export function isRearMountedAerospaceEquipment(id: string): boolean {
  return id.trim().toLowerCase().startsWith('r-');
}
