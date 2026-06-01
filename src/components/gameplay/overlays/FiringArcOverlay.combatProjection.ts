import type { ICombatRangeHex } from '@/types/gameplay';

export type FiringArcCombatProjectionAttributes = Readonly<
  Record<string, string | number | undefined>
>;

function formatBoolean(value: boolean | undefined): string | undefined {
  return value === undefined ? undefined : value ? 'true' : 'false';
}

function formatIds(ids: readonly string[]): string | undefined {
  return ids.length > 0 ? ids.join(',') : undefined;
}

function formatRangeBracket(rangeBracket: ICombatRangeHex['rangeBracket']) {
  return rangeBracket.replace(/_/g, ' ');
}

function formatDistance(distance: number): string {
  return distance === 1 ? '1 hex' : `${distance} hexes`;
}

function formatAvailability(projection: ICombatRangeHex): string {
  if (projection.weaponIdsAvailable.length > 0) {
    return `available weapons ${projection.weaponIdsAvailable.join(', ')}`;
  }

  if (projection.blockedReason) return projection.blockedReason;
  if (projection.attackInvalidDetails) return projection.attackInvalidDetails;
  if (projection.attackInvalidReason) return projection.attackInvalidReason;
  return 'no available weapons';
}

export function firingArcCombatProjectionSummary(
  projection: ICombatRangeHex | undefined,
): string | null {
  if (!projection) return null;

  const range = formatRangeBracket(projection.rangeBracket);
  const availability = formatAvailability(projection);
  const status = projection.attackable ? 'attackable' : 'not attackable';

  return `Combat projection ${projection.firingArc} arc; ${status}; range ${range} at ${formatDistance(projection.distance)}; in range ${projection.inRange ? 'yes' : 'no'}; in arc ${projection.inArc ? 'yes' : 'no'}; ${availability}`;
}

export function firingArcCombatProjectionAttributes(
  projection: ICombatRangeHex | undefined,
): FiringArcCombatProjectionAttributes {
  return {
    'data-combat-projection-firing-arc': projection?.firingArc,
    'data-combat-projection-range-bracket': projection?.rangeBracket,
    'data-combat-projection-distance': projection?.distance,
    'data-combat-projection-in-range': formatBoolean(projection?.inRange),
    'data-combat-projection-in-arc': formatBoolean(projection?.inArc),
    'data-combat-projection-attackable': formatBoolean(projection?.attackable),
    'data-combat-projection-has-target': formatBoolean(projection?.hasTarget),
    'data-combat-projection-target-ids': projection
      ? formatIds(projection.targetUnitIds)
      : undefined,
    'data-combat-projection-valid-target-ids': projection
      ? formatIds(projection.validTargetUnitIds)
      : undefined,
    'data-combat-projection-weapons-in-range': projection
      ? formatIds(projection.weaponIdsInRange)
      : undefined,
    'data-combat-projection-weapons-in-arc': projection
      ? formatIds(projection.weaponIdsInArc)
      : undefined,
    'data-combat-projection-weapons-available': projection
      ? formatIds(projection.weaponIdsAvailable)
      : undefined,
    'data-combat-projection-blocked-reason': projection?.blockedReason,
    'data-combat-projection-invalid-reason': projection?.attackInvalidReason,
    'data-combat-projection-invalid-details': projection?.attackInvalidDetails,
  };
}
