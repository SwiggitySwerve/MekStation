import type { ExplosiveEquipmentEntry } from '@/utils/construction/battleValueExplosivePenalties';

import type { UnitData } from './types';

import { normalizeCritName, normalizeEquipId, toMechLoc } from './normalizers';

/** Project unambiguous split mounts; CASE policy stays in the penalty owner. */
export function linkSplitExplosiveMounts(
  unit: UnitData,
  criticals: ReadonlyMap<string, ExplosiveEquipmentEntry[]>,
): void {
  for (const [identity, parts] of criticals) {
    const locations = [...new Set(parts.map((part) => part.location))];
    if (locations.length < 2) continue;
    const mounts = unit.equipment.filter(
      (eq) => normalizeCritName(normalizeEquipId(eq.id)) === identity,
    );
    // Multiple mounts or a quantity token cannot identify critical membership.
    if (mounts.length !== 1 || Number.parseInt(mounts[0].id, 10) > 1) continue;
    const primary = toMechLoc(mounts[0].location.split(',')[0]);
    if (!primary || !locations.includes(primary)) continue;
    for (const part of parts) {
      part.location = primary;
      part.additionalLocations = locations.filter(
        (location) => location !== primary,
      );
    }
  }
}
