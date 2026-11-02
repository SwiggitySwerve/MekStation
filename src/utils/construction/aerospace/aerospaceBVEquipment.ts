import type {
  IAerospaceBVEquipment,
  IAerospaceBVInput,
} from './aerospaceBVTypes';

import { sumCappedAmmoBV } from '../battleValueAmmo';
import { isNonExplosiveAmmo } from '../battleValueExplosivePenalties';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import {
  getEquipmentEntry,
  getAmmunitionEntry,
  resolveAmmoBV,
} from '../equipmentBVResolver';

// Canonical catalog identities corresponding to MiscType flags in pinned
// BVCalculator.countsAsDefensiveEquipment (518-546). No substring matching:
// a coolant pod or Blue Shield is not defensive equipment in that stage.
const DEFENSIVE_MISC_IDS: ReadonlySet<string> = new Set([
  'antipersonnelpod',
  'mass',
  'bridge-layer-heavy',
  'bridge-layer-medium',
  'bridge-layer-light',
  'bulldozer',
  'chaffpod',
  'spikes',
  'minesweeper',
  'harjel-repair-systems-harjel-ii',
  'harjel-repair-systems-harjel-iii',
  'smallshield',
  'mediumshield',
  'largeshield',
  'risc-viral-jammer-decoy',
  'risc-viral-jammer-homing',
  'm-pod',
  'b-pod',
]);

type DefensiveKind = 'equipment' | 'ams' | 'amsAmmo';

/** Represented Java defensive identities; unresolved equipment stays unresolved. */
export function getAerospaceDefensiveEquipmentKind(
  id: string,
): DefensiveKind | undefined {
  const entry = getEquipmentEntry(id);
  if (!entry) return undefined;
  if (entry.id === 'ams-ammo' || entry.id === 'clan-ams-ammo') return 'amsAmmo';
  if (entry.id === 'ams' || entry.id === 'clan-ams') return 'ams';
  if (
    entry.category === 'ECM' ||
    entry.category === 'Active Probe' ||
    entry.subType === 'Anti-Missile System' ||
    DEFENSIVE_MISC_IDS.has(entry.id)
  ) {
    return 'equipment';
  }
  return undefined;
}

/** BVCalculator.processDefensiveEquipment: mount multiplicity and AMS ammo cap. */
export function calculateMountedAerospaceDefensiveBV(
  equipment: readonly IAerospaceBVEquipment[],
): number {
  let equipmentBV = 0;
  let amsBV = 0;
  let amsAmmoBV = 0;
  for (const item of equipment) {
    const kind = getAerospaceDefensiveEquipmentKind(item.id);
    if (!kind) continue;
    if (kind === 'amsAmmo') {
      amsAmmoBV += resolveAmmoBV(item.id).battleValue;
    } else {
      const bv = getEquipmentEntry(item.id)?.battleValue ?? 0;
      equipmentBV += bv;
      if (kind === 'ams') amsBV += bv;
    }
  }
  return equipmentBV + sumCappedAmmoBV({ ams: amsAmmoBV }, () => amsBV);
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
