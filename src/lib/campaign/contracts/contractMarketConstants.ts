/**
 * Contract Market Constants - Static data for contract generation
 *
 * Holds the frozen lookup tables (contract types, employers, systems) and the
 * numeric tuning constants (payment rates, duration/salvage ranges, group
 * weights) used across the contract market. Extracted from contractMarket.ts
 * so the generation logic stays small and these magic numbers live in one place.
 *
 * @module lib/campaign/contracts/contractMarketConstants
 */

import {
  AtBContractType,
  ContractGroup,
} from '@/types/campaign/contracts/contractTypes';

/**
 * Available contract types for random selection.
 */
export const CONTRACT_TYPES: readonly string[] = Object.freeze([
  'Garrison Duty',
  'Recon',
  'Raid',
  'Extraction',
  'Escort',
]);

/**
 * Available employer factions for random selection.
 */
export const EMPLOYER_FACTIONS: readonly string[] = Object.freeze([
  // Inner Sphere Great Houses
  'Davion',
  'Steiner',
  'Liao',
  'Marik',
  'Kurita',
  // Clans
  'Wolf',
  'Jade Falcon',
  'Ghost Bear',
  // Mercenary
  'Kell Hounds',
  "Wolf's Dragoons",
]);

/**
 * Available star systems for random selection.
 */
export const SYSTEMS: readonly string[] = Object.freeze([
  'Hesperus II',
  'Solaris VII',
  'Tukayyid',
  'New Avalon',
  'Tharkad',
  'Sian',
  'Atreus',
  'Luthien',
  'Terra',
  'Outreach',
  'Galatea',
  'Arc-Royal',
  'Coventry',
  'Tikonov',
  'Strana Mechty',
]);

/**
 * Placeholder BV per unit (until real BV calculator is integrated).
 */
export const PLACEHOLDER_BV_PER_UNIT = 1000;

/**
 * Payment rate: C-bills per BV point.
 */
export const CBILLS_PER_BV = 1000;

/**
 * Placeholder AtB base-pay rates in C-bills per contract month.
 * These intentionally live in one table so later economy tuning does not
 * require changing generation logic.
 */
export const ATB_BASE_PAY_PER_MONTH_BY_TYPE: Readonly<
  Record<AtBContractType, number>
> = Object.freeze({
  [AtBContractType.GARRISON_DUTY]: 120_000,
  [AtBContractType.CADRE_DUTY]: 100_000,
  [AtBContractType.SECURITY_DUTY]: 145_000,
  [AtBContractType.RIOT_DUTY]: 130_000,
  [AtBContractType.RETAINER]: 110_000,
  [AtBContractType.DIVERSIONARY_RAID]: 260_000,
  [AtBContractType.OBJECTIVE_RAID]: 240_000,
  [AtBContractType.RECON_RAID]: 240_000,
  [AtBContractType.EXTRACTION_RAID]: 240_000,
  [AtBContractType.ASSASSINATION]: 300_000,
  [AtBContractType.OBSERVATION_RAID]: 240_000,
  [AtBContractType.GUERRILLA_WARFARE]: 320_000,
  [AtBContractType.ESPIONAGE]: 360_000,
  [AtBContractType.SABOTAGE]: 360_000,
  [AtBContractType.TERRORISM]: 300_000,
  [AtBContractType.PLANETARY_ASSAULT]: 280_000,
  [AtBContractType.RELIEF_DUTY]: 180_000,
  [AtBContractType.PIRATE_HUNTING]: 220_000,
  [AtBContractType.MOLE_HUNTING]: 220_000,
});

export const ATB_MIN_CONTRACT_BASE_PAY = 100_000;

/**
 * Payment multipliers for contract outcomes.
 */
export const PAYMENT_MULTIPLIERS = Object.freeze({
  success: 2.0,
  partial: 1.5,
  failure: 0.5,
});

/**
 * Duration range in days.
 */
export const DURATION_MIN_DAYS = 30;
export const DURATION_MAX_DAYS = 90;

/**
 * Salvage percentage range.
 */
export const SALVAGE_MIN_PERCENT = 40;
export const SALVAGE_MAX_PERCENT = 60;

/**
 * Weights for contract group selection.
 * Garrison is most common, guerrilla is rarest.
 */
export const CONTRACT_GROUP_WEIGHTS: Record<ContractGroup, number> = {
  garrison: 40,
  raid: 30,
  guerrilla: 10,
  special: 20,
};
