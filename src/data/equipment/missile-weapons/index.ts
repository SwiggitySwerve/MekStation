import { Equipment } from '../types';

// Import all missile weapon families
export * from './lrm';
export * from './srm';
export * from './streak';
export * from './atm';
export * from './mml';
export * from './thunderbolt';
export * from './mrm';

// Import individual weapons for aggregation
import {
  ENHANCED_LRM_10,
  ENHANCED_LRM_5,
  EXTENDED_LRM_10,
  EXTENDED_LRM_15,
  EXTENDED_LRM_20,
  IMPROVED_LRM_15,
  IMPROVED_LRM_20,
  LRM_10,
  LRM_15,
  LRM_20,
  LRM_5
} from './lrm';

import {
  IMPROVED_SRM_6,
  SRM_2,
  SRM_4,
  SRM_6
} from './srm';

import {
  PROTOTYPE_STREAK_SRM_4,
  PROTOTYPE_STREAK_SRM_6,
  STREAK_LRM_10,
  STREAK_LRM_15,
  STREAK_LRM_15_AMMO_OMNIPOD,
  STREAK_LRM_20,
  STREAK_LRM_20_AMMO_OMNIPOD,
  STREAK_LRM_5,
  STREAK_SRM_2,
  STREAK_SRM_4,
  STREAK_SRM_4_I_OS,
  STREAK_SRM_4_AMMO,
  STREAK_SRM_6,
  STREAK_SRM_6_AMMO
} from './streak';

import {
  ATM_3,
  ATM_6,
  ATM_9,
  ATM_12,
  IATM_3,
  IATM_6,
  IATM_9,
  IATM_12
} from './atm';

import {
  MML_3,
  MML_5,
  MML_7,
  MML_9
} from './mml';

import {
  THUNDERBOLT_5,
  THUNDERBOLT_10,
  THUNDERBOLT_15,
  THUNDERBOLT_20
} from './thunderbolt';

import {
  MRM_10,
  MRM_20,
  MRM_30,
  MRM_40
} from './mrm';

// Aggregate all missile weapons
export const MISSILE_WEAPONS: Equipment[] = [
  // Enhanced/Extended/Improved LRMs
  ENHANCED_LRM_10,
  ENHANCED_LRM_5,
  EXTENDED_LRM_10,
  EXTENDED_LRM_15,
  EXTENDED_LRM_20,
  IMPROVED_LRM_15,
  IMPROVED_LRM_20,
  IMPROVED_SRM_6,
  // Standard LRMs/SRMs
  LRM_10,
  LRM_15,
  LRM_20,
  LRM_5,
  SRM_2,
  SRM_4,
  SRM_6,
  // Streak variants
  STREAK_LRM_10,
  STREAK_LRM_15,
  STREAK_LRM_15_AMMO_OMNIPOD,
  STREAK_LRM_20,
  STREAK_LRM_20_AMMO_OMNIPOD,
  STREAK_LRM_5,
  STREAK_SRM_2,
  STREAK_SRM_4,
  STREAK_SRM_4_I_OS,
  STREAK_SRM_4_AMMO,
  STREAK_SRM_6,
  STREAK_SRM_6_AMMO,
  // Prototype variants
  PROTOTYPE_STREAK_SRM_4,
  PROTOTYPE_STREAK_SRM_6,
  // ATM systems
  ATM_3,
  ATM_6,
  ATM_9,
  ATM_12,
  // IATM systems
  IATM_3,
  IATM_6,
  IATM_9,
  IATM_12,
  // MML systems
  MML_3,
  MML_5,
  MML_7,
  MML_9,
  // Thunderbolt missiles
  THUNDERBOLT_5,
  THUNDERBOLT_10,
  THUNDERBOLT_15,
  THUNDERBOLT_20,
  // MRM systems
  MRM_10,
  MRM_20,
  MRM_30,
  MRM_40
]; 