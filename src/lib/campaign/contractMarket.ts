/**
 * Contract Market - Generates random contracts for campaign system
 *
 * Provides contract generation with random type, employer, target, system,
 * and payment calculation based on force BV. Contracts can be accepted
 * and added to a campaign.
 *
 * Based on MekHQ AbstractContractMarket.java, simplified for MVP.
 *
 * The static lookup tables and tuning constants live in
 * ./contracts/contractMarketConstants, the seeded-randomness primitives in
 * ./contracts/contractRandomHelpers, and the per-attribute random selectors in
 * ./contracts/contractSelection. They are re-exported here so the public API
 * of this module remains unchanged for all existing importers and tests.
 *
 * @module lib/campaign/contractMarket
 */

import { ICampaign } from '@/types/campaign/Campaign';
import {
  AtBContractType,
  CONTRACT_TYPE_DEFINITIONS,
} from '@/types/campaign/contracts/contractTypes';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { getAllUnits } from '@/types/campaign/Force';
import { IContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';

import {
  calculateContractLength,
  contractLengthToDays,
} from './contracts/contractLength';
import {
  ATB_BASE_PAY_PER_MONTH_BY_TYPE,
  ATB_MIN_CONTRACT_BASE_PAY,
  CBILLS_PER_BV,
  PLACEHOLDER_BV_PER_UNIT,
} from './contracts/contractMarketConstants';
import { negotiateAllClauses } from './contracts/contractNegotiation';
import {
  buildContractRecord,
  buildOutcomePaymentTerms,
} from './contracts/contractPayment';
import { defaultRandom, RandomFn } from './contracts/contractRandomHelpers';
import {
  generateContractId,
  generateContractName,
  generateRandomDuration,
  generateRandomSalvagePercent,
  randomContractType,
  randomEmployer,
  randomSystem,
  randomTarget,
  selectAtBContractType,
  selectFollowupContractType,
} from './contracts/contractSelection';
import {
  getContractNegotiationModifier,
  getContractPayMultiplier,
} from './markets/marketStandingIntegration';

// =============================================================================
// Re-exports - preserve the historical public API of this module
// =============================================================================

export {
  CBILLS_PER_BV,
  CONTRACT_GROUP_WEIGHTS,
  CONTRACT_TYPES,
  ATB_BASE_PAY_PER_MONTH_BY_TYPE,
  ATB_MIN_CONTRACT_BASE_PAY,
  DURATION_MAX_DAYS,
  DURATION_MIN_DAYS,
  EMPLOYER_FACTIONS,
  PAYMENT_MULTIPLIERS,
  PLACEHOLDER_BV_PER_UNIT,
  SALVAGE_MAX_PERCENT,
  SALVAGE_MIN_PERCENT,
  SYSTEMS,
} from './contracts/contractMarketConstants';
export type { RandomFn } from './contracts/contractRandomHelpers';
export {
  generateContractName,
  generateRandomDuration,
  generateRandomSalvagePercent,
  randomContractType,
  randomEmployer,
  randomSystem,
  randomTarget,
  selectAtBContractType,
} from './contracts/contractSelection';

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

export function calculateAtBBasePayment(
  contractType: AtBContractType,
  durationDays: number,
): Money {
  const monthlyRate = ATB_BASE_PAY_PER_MONTH_BY_TYPE[contractType];
  const durationMultiplier = Math.max(1, durationDays / 30);
  const amount = Math.max(
    ATB_MIN_CONTRACT_BASE_PAY,
    Math.round(monthlyRate * durationMultiplier),
  );
  return new Money(amount);
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
    const paymentTerms = buildOutcomePaymentTerms(basePayment, salvagePercent);

    const contract = buildContractRecord({
      id: generateContractId(),
      name: generateContractName(type, employer),
      system,
      employer,
      target,
      paymentTerms,
      startDate: campaign.currentDate,
      durationDays: duration,
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

    const basePayment = calculateAtBBasePayment(atbType, durationDays);
    const salvagePercent = generateRandomSalvagePercent(random);

    const paymentTerms = buildOutcomePaymentTerms(basePayment, salvagePercent);

    const contract = buildContractRecord({
      id: generateContractId(),
      name: generateContractName(typeDef.name, employer),
      system,
      employer,
      target,
      paymentTerms,
      startDate: campaign.currentDate,
      durationDays,
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
  const { typeName, atbType } = selectFollowupContractType(
    completedContract,
    random,
  );

  // Scale payment up by 10%
  const baseAmount = completedContract.paymentTerms.basePayment.amount;
  const scaledPayment = new Money(Math.round(baseAmount * 1.1 * 100) / 100);

  const salvagePercent = generateRandomSalvagePercent(random);
  const paymentTerms = buildOutcomePaymentTerms(scaledPayment, salvagePercent);

  // Duration: use AtB length if applicable, otherwise legacy random
  let durationDays: number;
  if (atbType) {
    const lengthMonths = calculateContractLength(atbType, random);
    durationDays = contractLengthToDays(lengthMonths);
  } else {
    durationDays = generateRandomDuration(random);
  }

  const contract = buildContractRecord({
    id: generateContractId(),
    name: generateContractName(typeName, employer),
    system,
    employer,
    target,
    paymentTerms,
    startDate: campaign.currentDate,
    durationDays,
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
    const scaledTerms = buildOutcomePaymentTerms(
      scaledBase,
      contract.paymentTerms.salvagePercent,
    );

    return {
      ...contract,
      paymentTerms: scaledTerms,
    };
  });
}
