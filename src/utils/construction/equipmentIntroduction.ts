import { isAmmunitionEquipmentId } from './equipmentBV/catalogLoader';
import { getEquipmentEntry } from './equipmentBVResolver';

/** MegaMek48fcb2f6 TestEntity.java:1487-1512,1611-1618; TestXMLOption.java:85-86. */
export const INTRO_YEAR_MARGIN = 5;

export function equipmentIntroductionErrors(source: {
  readonly equipment: readonly string[];
  readonly years: readonly number[];
  readonly clan: boolean;
  readonly mixed: boolean;
}): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const raw of source.equipment) {
    const name = raw
      .replace(/^(?:(?:\(R\)|\(B\))\s*)+/i, '')
      .replace(/^(?:r-|b-)+/i, '')
      .split(':')[0];
    if (isAmmunitionEquipmentId(name) || /ammo/i.test(name)) continue;
    const entry = getEquipmentEntry(name);
    if (!entry || entry.introductionYear === undefined || seen.has(entry.id))
      continue;
    seen.add(entry.id);
    if (!source.mixed && (entry.techBase === 'CLAN') !== source.clan) continue;
    const intro = entry.introductionYear;
    if (!source.years.some((year) => intro <= year + INTRO_YEAR_MARGIN))
      errors.push(`${entry.name} has intro date of ${intro}`);
  }
  return errors;
}
