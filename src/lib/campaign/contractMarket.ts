/**
 * Contract Market - Generates random contracts for campaign system
 *
 * Provides contract generation with random type, employer, target, system,
 * and payment calculation based on force BV. Contracts can be accepted
 * and added to a campaign.
 *
 * Based on MekHQ AbstractContractMarket.java, simplified for MVP.
 *
 * @module lib/campaign/contractMarket
 */

import { ICampaign } from '@/types/campaign/Campaign';
import {
  AtBContractType,
  CONTRACT_TYPE_DEFINITIONS,
  ContractGroup,
  getContractTypesByGroup,
  getAvailableContractTypes,
} from '@/types/campaign/contracts/contractTypes';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { getAllUnits } from '@/types/campaign/Force';
import { IContract, createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createPaymentTerms } from '@/types/campaign/PaymentTerms';

import {
  calculateContractLength,
  contractLengthToDays,
} from './contracts/contractLength';
import { negotiateAllClauses } from './contracts/contractNegotiation';
import {
  getContractPayMultiplier,
  getContractNegotiationModifier,
} from './markets/marketStandingIntegration';

// =============================================================================
// Constants
// =============================================================================

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

// =============================================================================
// Random Helpers (seeded for testability)
// =============================================================================

/**
 * Random number generator function type.
 * Returns a number in [0, 1) like Math.random().
 */
export type RandomFn = () => number;

/**
 * Default random function using Math.random().
 */
const defaultRandom: RandomFn = () => Math.random();

/**
 * Pick a random element from an array.
 *
 * @param array - Array to pick from
 * @param random - Random function (default: Math.random)
 * @returns Random element from the array
 */
function pickRandom<T>(
  array: readonly T[],
  random: RandomFn = defaultRandom,
): T {
  const index = Math.floor(random() * array.length);
  return array[index];
}

/**
 * Generate a random integer in [min, max] inclusive.
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param random - Random function (default: Math.random)
 * @returns Random integer in range
 */
function randomInt(
  min: number,
  max: number,
  random: RandomFn = defaultRandom,
): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

// =============================================================================
// Core Functions
// =============================================================================

/**
 * Calculate total BV of all units in campaign forces.
 *
 * Uses placeholder BV (1000 per unit) as a fallback.
 * Note: Full BV calculation requires access to unit data which is not available
 * in this context. For accurate BV, use ForceRepository.calculateStats() which
 * has database access to fetch unit data.
 *
 * @param campaign - Campaign to calculate BV for
 * @returns Total BV (placeholder: 1000 per unit)
 */
export function calculateForceBV(campaign: ICampaign): number {
  const rootForce = campaign.forces.get(campaign.rootForceId);
  if (!rootForce) {
    return 0;
  }

  const allUnitIds = getAllUnits(rootForce, campaign.forces);
  return allUnitIds.length * PLACEHOLDER_BV_PER_UNIT;
}

/**
 * Generate a contract name from type and employer.
 *
 * @param type - Contract type (e.g., "Garrison Duty")
 * @param employer - Employer faction name (e.g., "Davion")
 * @returns Contract name (e.g., "Garrison Duty for House Davion")
 */
export function generateContractName(type: string, employer: string): string {
  // Clans and mercenary units don't use "House" prefix
  const clanFactions = ['Wolf', 'Jade Falcon', 'Ghost Bear'];
  const mercFactions = ['Kell Hounds', "Wolf's Dragoons"];

  if (clanFactions.includes(employer)) {
    return `${type} for Clan ${employer}`;
  }
  if (mercFactions.includes(employer)) {
    return `${type} for ${employer}`;
  }
  return `${type} for House ${employer}`;
}

/**
 * Generate a random contract duration in days.
 *
 * @param random - Random function (default: Math.random)
 * @returns Duration in days (30-90)
 */
export function generateRandomDuration(
  random: RandomFn = defaultRandom,
): number {
  return randomInt(DURATION_MIN_DAYS, DURATION_MAX_DAYS, random);
}

/**
 * Generate a random salvage percentage.
 *
 * @param random - Random function (default: Math.random)
 * @returns Salvage percentage (40-60)
 */
export function generateRandomSalvagePercent(
  random: RandomFn = defaultRandom,
): number {
  return randomInt(SALVAGE_MIN_PERCENT, SALVAGE_MAX_PERCENT, random);
}

/**
 * Select a random contract type.
 *
 * @param random - Random function (default: Math.random)
 * @returns Random contract type string
 */
export function randomContractType(random: RandomFn = defaultRandom): string {
  return pickRandom(CONTRACT_TYPES, random);
}

/**
 * Select a random employer faction.
 *
 * @param random - Random function (default: Math.random)
 * @returns Random employer faction name
 */
export function randomEmployer(random: RandomFn = defaultRandom): string {
  return pickRandom(EMPLOYER_FACTIONS, random);
}

/**
 * Select a random target faction different from the employer.
 *
 * @param employer - Employer faction to exclude
 * @param random - Random function (default: Math.random)
 * @returns Random target faction name (different from employer)
 */
export function randomTarget(
  employer: string,
  random: RandomFn = defaultRandom,
): string {
  const targets = EMPLOYER_FACTIONS.filter((f) => f !== employer);
  return pickRandom(targets, random);
}

/**
 * Select a random star system.
 *
 * @param random - Random function (default: Math.random)
 * @returns Random system name
 */
export function randomSystem(random: RandomFn = defaultRandom): string {
  return pickRandom(SYSTEMS, random);
}

/**
 * Select a random AtB contract type using group weights.
 * First selects a group weighted by CONTRACT_GROUP_WEIGHTS,
 * then uniformly selects a type within that group.
 *
 * @param random - Random function (default: Math.random)
 * @returns Random AtB contract type
 */
export function selectAtBContractType(
  random: RandomFn = defaultRandom,
): AtBContractType {
  const groups = Object.keys(CONTRACT_GROUP_WEIGHTS) as ContractGroup[];
  const totalWeight = Object.values(CONTRACT_GROUP_WEIGHTS).reduce(
    (a, b) => a + b,
    0,
  );

  let roll = random() * totalWeight;
  let selectedGroup: ContractGroup = 'garrison';
  for (const group of groups) {
    roll -= CONTRACT_GROUP_WEIGHTS[group];
    if (roll <= 0) {
      selectedGroup = group;
      break;
    }
  }

  const typesInGroup = getContractTypesByGroup(selectedGroup);
  return pickRandom(typesInGroup, random);
}

/**
 * Generate a unique contract ID.
 *
 * @returns Unique contract ID string
 */
function generateContractId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `contract-${timestamp}-${random}`;
}

/**
 * Generate random contracts for a campaign.
 *
 * Creates contracts with random types, employers, targets, systems,
 * and payment terms scaled to the campaign's force BV.
 *
 * @param campaign - Campaign to generate contracts for
 * @param count - Number of contracts to generate (default 5)
 * @param random - Random function for testability (default: Math.random)
 * @returns Array of generated contracts
 *
 * @example
 * const contracts = generateContracts(campaign);
 * // Returns 5 random contracts with payment scaled to force BV
 *
 * @example
 * const contracts = generateContracts(campaign, 3);
 * // Returns 3 random contracts
 */
export function generateContracts(
  campaign: ICampaign,
  count: number = 5,
  random: RandomFn = defaultRandom,
): IContract[] {
  const contracts: IContract[] = [];
  const forceBV = calculateForceBV(campaign);

  for (let i = 0; i < count; i++) {
    const type = randomContractType(random);
    const employer = randomEmployer(random);
    const target = randomTarget(employer, random);
    const system = randomSystem(random);
    const duration = generateRandomDuration(random);
    const salvagePercent = generateRandomSalvagePercent(random);

    const basePayment = new Money(forceBV * CBILLS_PER_BV);
    const paymentTerms = createPaymentTerms({
      basePayment,
      successPayment: basePayment.multiply(PAYMENT_MULTIPLIERS.success),
      partialPayment: basePayment.multiply(PAYMENT_MULTIPLIERS.partial),
      failurePayment: basePayment.multiply(PAYMENT_MULTIPLIERS.failure),
      salvagePercent,
    });

    const startDate = campaign.currentDate;
    const endDate = new Date(
      startDate.getTime() + duration * 24 * 60 * 60 * 1000,
    );

    const contract = createContract({
      id: generateContractId(),
      name: generateContractName(type, employer),
      status: MissionStatus.PENDING,
      systemId: system,
      employerId: employer,
      targetId: target,
      paymentTerms,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    contracts.push(contract);
  }

  return contracts;
}

/**
 * Generate AtB contracts with 19 contract types, variable lengths, and negotiated clauses.
 *
 * This is the expanded version that uses AtB contract types instead of the 5 legacy types.
 *
 * @param campaign - Campaign to generate contracts for
 * @param count - Number of contracts to generate (default 5)
 * @param negotiatorSkill - Negotiation skill modifier (default 0)
 * @param factionStandingMod - Faction standing modifier (default 0)
 * @param random - Random function for testability
 * @returns Array of generated contracts with AtB types and clauses
 */
export function generateAtBContracts(
  campaign: ICampaign,
  count: number = 5,
  negotiatorSkill: number = 0,
  factionStandingMod: number = 0,
  random: RandomFn = defaultRandom,
): IContract[] {
  const contracts: IContract[] = [];
  const forceBV = calculateForceBV(campaign);

  for (let i = 0; i < count; i++) {
    const atbType = selectAtBContractType(random);
    const typeDef = CONTRACT_TYPE_DEFINITIONS[atbType];
    const employer = randomEmployer(random);
    const target = randomTarget(employer, random);
    const system = randomSystem(random);

    // Variable contract length
    const lengthMonths = calculateContractLength(atbType, random);
    const durationDays = contractLengthToDays(lengthMonths);

    // Negotiate clauses
    const _clauses = negotiateAllClauses(
      negotiatorSkill,
      factionStandingMod,
      random,
    );

    // Ops tempo affects payment (higher tempo = higher risk = more pay)
    const opsMultiplier = typeDef.opsTempo.min;
    const basePayment = new Money(
      Math.round(forceBV * CBILLS_PER_BV * opsMultiplier),
    );
    const salvagePercent = generateRandomSalvagePercent(random);

    const paymentTerms = createPaymentTerms({
      basePayment,
      successPayment: basePayment.multiply(PAYMENT_MULTIPLIERS.success),
      partialPayment: basePayment.multiply(PAYMENT_MULTIPLIERS.partial),
      failurePayment: basePayment.multiply(PAYMENT_MULTIPLIERS.failure),
      salvagePercent,
    });

    const startDate = campaign.currentDate;
    const endDate = new Date(
      startDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
    );

    const contract = createContract({
      id: generateContractId(),
      name: generateContractName(typeDef.name, employer),
      status: MissionStatus.PENDING,
      systemId: system,
      employerId: employer,
      targetId: target,
      paymentTerms,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    // Add AtB-specific fields
    const atbContract: IContract = {
      ...contract,
      atbContractType: atbType,
    };

    contracts.push(atbContract);
  }

  return contracts;
}

/**
 * Accept a contract and add it to the campaign.
 *
 * Sets the contract status to ACTIVE and adds it to the campaign's
 * missions Map. Returns a new campaign instance (immutable update).
 *
 * @param campaign - Campaign to add contract to
 * @param contract - Contract to accept
 * @returns Updated campaign with contract added
 * @throws Error if contract already exists in campaign
 *
 * @example
 * const contracts = generateContracts(campaign);
 * const updatedCampaign = acceptContract(campaign, contracts[0]);
 */
export function acceptContract(
  campaign: ICampaign,
  contract: IContract,
): ICampaign {
  if (campaign.missions.has(contract.id)) {
    throw new Error(`Contract ${contract.id} already exists in campaign`);
  }

  const updatedContract: IContract = {
    ...contract,
    status: MissionStatus.ACTIVE,
  };

  const updatedMissions = new Map(campaign.missions);
  updatedMissions.set(updatedContract.id, updatedContract);

  return {
    ...campaign,
    missions: updatedMissions,
  };
}

// =============================================================================
// Standing Integration & Followup Functions
// =============================================================================

/**
 * Generate a followup contract based on a completed contract.
 *
 * There is a 50% chance to generate a followup. If generated, the followup
 * retains the same employer and system but uses a different contract type
 * (from the same group if AtB) and scales payment up by 10%.
 *
 * @param campaign - Campaign context for BV and date calculations
 * @param completedContract - The contract that was just completed
 * @param random - Random function for testability (default: Math.random)
 * @returns A new followup contract, or null if chance fails
 */
export function generateFollowupContract(
  campaign: ICampaign,
  completedContract: IContract,
  random: RandomFn = defaultRandom,
): IContract | null {
  // 50% chance to generate a followup
  if (random() >= 0.5) {
    return null;
  }

  const employer = completedContract.employerId;
  const system = completedContract.systemId;
  const target = randomTarget(employer, random);
  const _forceBV = calculateForceBV(campaign);

  // Determine contract type - different from the completed one
  let typeName: string;
  let atbType: AtBContractType | undefined;

  if (completedContract.atbContractType) {
    // AtB contract: pick a different type from the same group
    const completedDef =
      CONTRACT_TYPE_DEFINITIONS[completedContract.atbContractType];
    const groupTypes = getContractTypesByGroup(completedDef.group);
    const otherTypes = groupTypes.filter(
      (t) => t !== completedContract.atbContractType,
    );

    if (otherTypes.length > 0) {
      atbType = pickRandom(otherTypes, random);
    } else {
      // Only one type in group, pick any different AtB type
      const allTypes = getAvailableContractTypes().filter(
        (t) => t !== completedContract.atbContractType,
      );
      atbType = pickRandom(allTypes, random);
    }
    typeName = CONTRACT_TYPE_DEFINITIONS[atbType].name;
  } else {
    // Legacy contract: pick a different legacy type
    const completedType = CONTRACT_TYPES.find((t) =>
      completedContract.name.includes(t),
    );
    const otherTypes = CONTRACT_TYPES.filter((t) => t !== completedType);
    typeName = pickRandom(otherTypes, random);
  }

  // Scale payment up by 10%
  const baseAmount = completedContract.paymentTerms.basePayment.amount;
  const scaledPayment = new Money(Math.round(baseAmount * 1.1 * 100) / 100);

  const salvagePercent = generateRandomSalvagePercent(random);
  const paymentTerms = createPaymentTerms({
    basePayment: scaledPayment,
    successPayment: scaledPayment.multiply(PAYMENT_MULTIPLIERS.success),
    partialPayment: scaledPayment.multiply(PAYMENT_MULTIPLIERS.partial),
    failurePayment: scaledPayment.multiply(PAYMENT_MULTIPLIERS.failure),
    salvagePercent,
  });

  // Duration: use AtB length if applicable, otherwise legacy random
  let durationDays: number;
  if (atbType) {
    const lengthMonths = calculateContractLength(atbType, random);
    durationDays = contractLengthToDays(lengthMonths);
  } else {
    durationDays = generateRandomDuration(random);
  }

  const startDate = campaign.currentDate;
  const endDate = new Date(
    startDate.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );

  const contract = createContract({
    id: generateContractId(),
    name: generateContractName(typeName, employer),
    status: MissionStatus.PENDING,
    systemId: system,
    employerId: employer,
    targetId: target,
    paymentTerms,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  if (atbType) {
    return {
      ...contract,
      atbContractType: atbType,
    };
  }

  return contract;
}

/**
 * Generate AtB contracts with faction standing modifiers applied.
 *
 * Wraps generateAtBContracts with standing-based pay multiplier and
 * negotiation modifier from the faction standing system.
 *
 * @param campaign - Campaign to generate contracts for
 * @param count - Number of contracts to generate (default 5)
 * @param random - Random function for testability (default: Math.random)
 * @returns Array of generated contracts with standing modifiers applied
 */
export function generateContractsWithStanding(
  campaign: ICampaign,
  count: number = 5,
  random: RandomFn = defaultRandom,
): IContract[] {
  const payMultiplier = getContractPayMultiplier(campaign);
  const negotiationMod = getContractNegotiationModifier(campaign);

  // Generate contracts with negotiation modifier passed through
  const contracts = generateAtBContracts(
    campaign,
    count,
    0,
    negotiationMod,
    random,
  );

  // Apply pay multiplier to base payment of each contract
  return contracts.map((contract) => {
    const scaledBase =
      contract.paymentTerms.basePayment.multiply(payMultiplier);
    const scaledTerms = createPaymentTerms({
      basePayment: scaledBase,
      successPayment: scaledBase.multiply(PAYMENT_MULTIPLIERS.success),
      partialPayment: scaledBase.multiply(PAYMENT_MULTIPLIERS.partial),
      failurePayment: scaledBase.multiply(PAYMENT_MULTIPLIERS.failure),
      salvagePercent: contract.paymentTerms.salvagePercent,
    });

    return {
      ...contract,
      paymentTerms: scaledTerms,
    };
  });
}
