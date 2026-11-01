import type { IAerospaceBVEquipment } from './aerospaceBVTypes';

import { sumCappedAmmoBV } from '../battleValueAmmo';
import { getEquipmentEntry, resolveAmmoBV } from '../equipmentBVResolver';

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
