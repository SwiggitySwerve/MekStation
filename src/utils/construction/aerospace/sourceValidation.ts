import type { Source } from './sourceWeight';

import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { getEquipmentEntry } from '../equipmentBVResolver';
import { aerospaceBays } from './sourceBays';
import {
  aerospaceSourceWeight,
  sourceArmor,
  advanced,
  large,
  sourceClan,
  sourcePoints,
} from './sourceWeight';

/** MegaMek 48fcb2f6 TestEntity.hasIncorrectIntroYear:1471-1512, called by TestAero:828 and
 * TestSupportVehicle:1221 only (not TestSmallCraft or TestAdvancedAerospace). Margin 5:
 * TestXMLOption.introYearMargin:85-86. Equipment loop only: ammunition is skipped (:1490), a
 * unit year or its original build year (:1612-1618) may satisfy a component, and a component
 * with no date for the unit's tech side is never flagged. Armor, engine and cockpit dates
 * (:1513-1607) are not ported; no pinned aerospace source depends on them.
 */
const INTRO_YEAR_MARGIN = 5;
const INTRO_YEAR_FAMILIES =
  /^(?:aerospacefighter|convfighter|fixedwingsupport)$/;
export function validateEquipmentIntroYears(s: Source): string[] {
  if (
    !INTRO_YEAR_FAMILIES.test(s.unitType.toLowerCase().replace(/[^a-z]/g, ''))
  )
    return [];
  const years = [s.year, s.originalBuildYear].filter(
    (y): y is number => typeof y === 'number',
  );
  const clan = sourceClan(s),
    mixed = /mixed/i.test(s.type);
  const errors: string[] = [],
    seen = new Set<string>();
  for (const [key, value] of Object.entries(s.rawTags)) {
    if (!/equipment$/i.test(key)) continue;
    const mounts = Array.isArray(value)
      ? value
      : value.split(/\r?\n/).filter(Boolean);
    for (const raw of mounts) {
      const name = raw
        .replace(/^(?:(?:\(R\)|\(B\))\s*)+/i, '')
        .replace(/^(?:r-|b-)+/i, '')
        .split(':')[0];
      if (isAmmunitionEquipmentId(name) || /ammo/i.test(name)) continue;
      const entry = getEquipmentEntry(name);
      if (!entry || entry.introductionYear === undefined || seen.has(entry.id))
        continue;
      seen.add(entry.id);
      if (!mixed && (entry.techBase === 'CLAN') !== clan) continue;
      const intro = entry.introductionYear;
      if (!years.some((y) => intro <= y + INTRO_YEAR_MARGIN))
        errors.push(`${entry.name} has intro date of ${intro}`);
    }
  }
  return errors;
}

/** MegaMek 48fcb2f6 TestAdvancedAerospace:870-959; TestSmallCraft:776-814.
 * Source facts are immutable; legacy/editor snapshots without them keep their contract.
 */
export function validateAerospaceSource(s: Source): string[] {
  const errors: string[] = [],
    capital = advanced(s),
    small = large(s);
  errors.push(...validateEquipmentIntroYears(s));
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
