// Import all capital weapons from separate files
export * from './naval-lasers';
export * from './naval-ppcs';
export * from './naval-gauss';
export * from './n-gauss';
export * from './mass-drivers';
export * from './sub-capital';
export * from './capital-missiles';

// Import all capital weapon constants
import {
  NAVAL_LASER_35,
  NAVAL_LASER_45,
  NAVAL_LASER_55
} from './naval-lasers';

import {
  NAVAL_PPC
} from './naval-ppcs';

import {
  LIGHT_NAVAL_GAUSS,
  MEDIUM_NAVAL_GAUSS,
  HEAVY_NAVAL_GAUSS
} from './naval-gauss';

import {
  LIGHT_N_GAUSS,
  MEDIUM_N_GAUSS,
  HEAVY_N_GAUSS
} from './n-gauss';

import {
  LIGHT_MASS_DRIVER,
  MEDIUM_MASS_DRIVER,
  HEAVY_MASS_DRIVER
} from './mass-drivers';

import {
  LIGHT_SUB_CAPITAL_CANNON,
  MEDIUM_SUB_CAPITAL_CANNON,
  HEAVY_SUB_CAPITAL_CANNON,
  LIGHT_SUB_CAPITAL_LASER,
  MEDIUM_SUB_CAPITAL_LASER,
  HEAVY_SUB_CAPITAL_LASER
} from './sub-capital';

import {
  KILLER_WHALE,
  KILLER_WHALE_T,
  WHITE_SHARK,
  WHITE_SHARK_T
} from './capital-missiles';

// Re-export all capital weapons in a single array
export const CAPITAL_WEAPONS = [
  // Naval Lasers
  NAVAL_LASER_35,
  NAVAL_LASER_45,
  NAVAL_LASER_55,
  // Naval PPCs
  NAVAL_PPC,
  // Naval Gauss
  LIGHT_NAVAL_GAUSS,
  MEDIUM_NAVAL_GAUSS,
  HEAVY_NAVAL_GAUSS,
  // N-Gauss
  LIGHT_N_GAUSS,
  MEDIUM_N_GAUSS,
  HEAVY_N_GAUSS,
  // Mass Drivers
  LIGHT_MASS_DRIVER,
  MEDIUM_MASS_DRIVER,
  HEAVY_MASS_DRIVER,
  // Sub-Capital Weapons
  LIGHT_SUB_CAPITAL_CANNON,
  MEDIUM_SUB_CAPITAL_CANNON,
  HEAVY_SUB_CAPITAL_CANNON,
  LIGHT_SUB_CAPITAL_LASER,
  MEDIUM_SUB_CAPITAL_LASER,
  HEAVY_SUB_CAPITAL_LASER,
  // Capital Missiles
  KILLER_WHALE,
  KILLER_WHALE_T,
  WHITE_SHARK,
  WHITE_SHARK_T
]; 