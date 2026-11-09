/** Canonical serialized UnitDestroyed causes. Vehicle causes remain a separate taxonomy. */
export const UNIT_DESTROYED_CAUSES = [
  'damage',
  'ammo_explosion',
  'pilot_death',
  'engine_destroyed',
  'impossible_displacement',
  'ct_destroyed',
  'head_destroyed',
] as const;

export type UnitDestroyedCause = (typeof UNIT_DESTROYED_CAUSES)[number];
