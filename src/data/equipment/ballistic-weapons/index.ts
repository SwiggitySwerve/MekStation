import { Equipment } from '../types';

// Import all ballistic weapon families
export * from './gauss';
export * from './autocannons';
export * from './lb-autocannons';
export * from './ultra-autocannons';
export * from './machine-guns';

// Import individual weapons for aggregation
import {
  AP_GAUSS_RIFLE,
  GAUSS_RIFLE,
  HEAVY_GAUSS_RIFLE,
  HYPER_ASSAULT_GAUSS_RIFLE_40_AMMO_OMNIPOD,
  IMPROVED_GAUSS_RIFLE,
  IMPROVED_HEAVY_GAUSS_RIFLE,
  LIGHT_GAUSS_RIFLE,
  SILVER_BULLET_GAUSS_RIFLE
} from './gauss';

import {
  AC_2,
  AC_5,
  AC_10,
  AC_20,
  LAC_2,
  LAC_5,
  LIGHT_AC_2,
  LIGHT_AC_5,
  ROTARY_AC_2,
  ROTARY_AC_5,
  HVAC_10,
  PROTOMECH_AC_2
} from './autocannons';

import {
  LB_2_X_AC,
  LB_5_X_AC,
  LB_10_X_AC,
  LB_20_X_AC
} from './lb-autocannons';

import {
  ULTRA_AC_2,
  ULTRA_AC_5,
  ULTRA_AC_10,
  ULTRA_AC_20
} from './ultra-autocannons';

import {
  MACHINE_GUN,
  LIGHT_MACHINE_GUN,
  HEAVY_MACHINE_GUN,
  ANTI_MISSILE_SYSTEM
} from './machine-guns';

// Aggregate all ballistic weapons
export const BALLISTIC_WEAPONS: Equipment[] = [
  // Gauss Rifles
  AP_GAUSS_RIFLE,
  GAUSS_RIFLE,
  HEAVY_GAUSS_RIFLE,
  HYPER_ASSAULT_GAUSS_RIFLE_40_AMMO_OMNIPOD,
  IMPROVED_GAUSS_RIFLE,
  IMPROVED_HEAVY_GAUSS_RIFLE,
  LIGHT_GAUSS_RIFLE,
  SILVER_BULLET_GAUSS_RIFLE,
  // Standard ACs
  AC_2,
  AC_5,
  AC_10,
  AC_20,
  // Ultra ACs
  ULTRA_AC_2,
  ULTRA_AC_5,
  ULTRA_AC_10,
  ULTRA_AC_20,
  // LB-X ACs
  LB_2_X_AC,
  LB_5_X_AC,
  LB_10_X_AC,
  LB_20_X_AC,
  // Light ACs
  LAC_2,
  LAC_5,
  LIGHT_AC_2,
  LIGHT_AC_5,
  // Rotary ACs
  ROTARY_AC_2,
  ROTARY_AC_5,
  // Hyper-Velocity AC
  HVAC_10,
  // Machine Guns
  MACHINE_GUN,
  LIGHT_MACHINE_GUN,
  HEAVY_MACHINE_GUN,
  // ProtoMech weapons
  PROTOMECH_AC_2,
  // Defensive Systems
  ANTI_MISSILE_SYSTEM
]; 