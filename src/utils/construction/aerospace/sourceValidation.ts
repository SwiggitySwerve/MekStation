import type { Source } from './sourceWeight';

import { aerospaceBays } from './sourceBays';
import {
  aerospaceSourceWeight,
  sourceArmor,
  advanced,
  large,
  sourceClan,
  sourcePoints,
} from './sourceWeight';

/** MegaMek 48fcb2f6 TestAdvancedAerospace:870-959; TestSmallCraft:776-814.
 * Source facts are immutable; legacy/editor snapshots without them keep their contract.
 */
export function validateAerospaceSource(s: Source): string[] {
  const errors: string[] = [],
    capital = advanced(s),
    small = large(s);
  const bays = aerospaceBays(s.transporters ?? [], sourceClan(s)),
    mass = aerospaceSourceWeight(s);
  if (mass !== undefined && mass > s.tonnage)
    errors.push(
      `Weight: ${mass.toFixed(1)} is greater than ${s.tonnage.toFixed(1)}`,
    );
  if (capital || (small && s.tonnage > 25)) {
    const crew = (s.crew ?? 0) - bays.personnel;
    const officers = Math.ceil(crew / 6);
    if (capital && (s.officers ?? 0) < officers)
      errors.push(`Requires at least ${officers} officers`);
    const occupants =
      crew + (s.passengers ?? 0) + (s.marines ?? 0) + (s.battlearmor ?? 0);
    if (bays.berths < occupants)
      errors.push(
        `Requires quarters for ${occupants} crew but only has ${bays.berths}`,
      );
  }
  if (small) {
    const armor = sourceArmor(s);
    if (armor && armor.mass > armor.maximum)
      errors.push(
        `Total armor,${armor.mass.toFixed(1)} tons, is greater than the maximum: ${armor.maximum.toFixed(1)}`,
      );
    if (armor && sourcePoints(s) > armor.available)
      errors.push(
        'More armor allocated than is available according to armor tonnage.',
      );
  }
  if (capital) errors.push(...bays.errors);
  return errors;
}
