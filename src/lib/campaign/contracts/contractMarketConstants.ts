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

import { ContractGroup } from '@/types/campaign/contracts/contractTypes';

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
