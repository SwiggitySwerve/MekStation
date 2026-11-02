import type {
  IAerospaceBVInput,
  IAerospaceBVEquipment,
} from './aerospaceBVTypes';

import {
  getDefensiveEquipmentKind,
  calculateMountedDefensiveEquipmentBV,
} from '../battleValueEquipment';
import { isNonExplosiveAmmo } from '../battleValueExplosivePenalties';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import { getEquipmentEntry, getAmmunitionEntry } from '../equipmentBVResolver';
export { getDefensiveEquipmentKind as getAerospaceDefensiveEquipmentKind };

export function calculateMountedAerospaceDefensiveBV(
  equipment: readonly IAerospaceBVEquipment[],
): number {
  return calculateMountedDefensiveEquipmentBV(
    equipment.filter((item) => getDefensiveEquipmentKind(item.id)),
  );
}

/** AeroBVCalculator.java:78-115; HeatTrackingBVCalculator.java:65-70,229-247. */
export function calculateMountedAerospaceExplosivePenalty(
  input: Pick<
    IAerospaceBVInput,
    'equipment' | 'techBase' | 'sourceTechType' | 'year'
  >,
  defensivePool: number,
): number {
  // Legacy flat inputs cannot decide chassis-wide Clan protection.
  if (input.techBase === undefined && input.sourceTechType === undefined)
    return 0;
  const sourceType = input.sourceTechType;
  const clan =
    sourceType !== undefined
      ? sourceType.startsWith('Clan') ||
        sourceType.startsWith('Mixed (Clan Chassis)')
      : input.techBase === 'CLAN' || input.techBase === 'Clan';
  const ammoTypes = new Set<string>();
  let explosiveMounts = 0;
  let hasCase = false;
  const capacitors = new Map<string, number>();
  const ppcs = new Map<string, number>();
  for (const item of input.equipment) {
    const entry = getEquipmentEntry(item.id);
    if (entry?.id === 'case' || entry?.id === 'caseii') hasCase = true;
    if (isAmmunitionEquipmentId(item.id)) {
      if (!isNonExplosiveAmmo(item.id) && !item.id.endsWith(':0')) {
        ammoTypes.add(
          getAmmunitionEntry(item.id)?.id ??
            item.id.toLowerCase().replace(/:omni$/, ''),
        );
      }
      continue;
    }
    if (!entry) continue;
    // MekFileParser.java:90-93; prototype PPCs lack the compatibility flag.
    if (
      [
        'ppc',
        'er-ppc',
        'light-ppc',
        'heavy-ppc',
        'snub-nose-ppc',
        'improved-ppc',
        'enhanced-ppc',
        'clan-er-ppc',
      ].includes(entry.id) &&
      (entry.id !== 'clan-er-ppc' || (input.year ?? 0) >= 3101)
    )
      ppcs.set(item.location, (ppcs.get(item.location) ?? 0) + 1);
    if (entry.id === 'ppc-capacitor')
      capacitors.set(item.location, (capacitors.get(item.location) ?? 0) + 1);
    if (
      ((entry.subType === 'Gauss Rifle' || entry.subType === 'Gauss') &&
        entry.id !== 'ap-gauss-rifle') ||
      entry.subType === 'Improved Heavy Laser' ||
      entry.subType === 'TSEMP' ||
      entry.id === 'ppc-capacitor' ||
      /^hyper-velocity-auto-cannon-(2|5|10)$/.test(entry.id)
    )
      explosiveMounts++;
  }
  for (const [location, count] of capacitors)
    explosiveMounts += Math.min(count, ppcs.get(location) ?? 0);
  if ((clan || hasCase) && (ammoTypes.size > 0 || explosiveMounts > 0))
    return 0;
  return (
    defensivePool -
    Math.max(1, defensivePool - 15 * ammoTypes.size - explosiveMounts)
  );
}
