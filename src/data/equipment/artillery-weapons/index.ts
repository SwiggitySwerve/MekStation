// Import all artillery pieces
export * from './artillery-pieces';

// Import all artillery cannons
export * from './artillery-cannons';

// Import all mortars
export * from './mortars';

// Re-export all equipment as a single array
import { Equipment } from '../types';
import {
  ARROW_IV_ARTILLERY,
  LONG_TOM_ARTILLERY,
  SNIPER_ARTILLERY,
  THUMPER_ARTILLERY
} from './artillery-pieces';
import {
  LONG_TOM_CANNON,
  SNIPER_ARTILLERY_CANNON,
  THUMPER_ARTILLERY_CANNON,
  ARTILLERY_CANNON
} from './artillery-cannons';
import {
  BA_TUBE_ARTILLERY,
  MECH_MORTAR_1,
  MECH_MORTAR_2,
  MECH_MORTAR_4,
  MECH_MORTAR_8
} from './mortars';

export const ARTILLERY_WEAPONS: Equipment[] = [
  // Artillery Pieces
  ARROW_IV_ARTILLERY,
  LONG_TOM_ARTILLERY,
  SNIPER_ARTILLERY,
  THUMPER_ARTILLERY,
  // Artillery Cannons
  LONG_TOM_CANNON,
  SNIPER_ARTILLERY_CANNON,
  THUMPER_ARTILLERY_CANNON,
  ARTILLERY_CANNON,
  // Mortars
  BA_TUBE_ARTILLERY,
  MECH_MORTAR_1,
  MECH_MORTAR_2,
  MECH_MORTAR_4,
  MECH_MORTAR_8
]; 