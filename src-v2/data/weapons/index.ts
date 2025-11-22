/**
 * index.ts
 * Export all weapon data.
 */

import { ENERGY_WEAPONS } from './EnergyWeapons';
import { BALLISTIC_WEAPONS } from './BallisticWeapons';
import { MISSILE_WEAPONS } from './MissileWeapons';

export const WEAPONS_DB = [
  ...ENERGY_WEAPONS,
  ...BALLISTIC_WEAPONS,
  ...MISSILE_WEAPONS,
];

// Helper for lookups
export const getWeaponById = (id: string) => WEAPONS_DB.find(w => w.id === id);

