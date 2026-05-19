/**
 * Contract Selection - Random attribute selection for contract generation
 *
 * Provides the pure selection functions that pick a contract's type, employer,
 * target, system, duration, salvage percentage, name, and ID. Extracted from
 * contractMarket.ts so the main module focuses on assembling IContract objects
 * while these reusable, individually testable pickers live together.
 *
 * @module lib/campaign/contracts/contractSelection
 */

import {
  AtBContractType,
  CONTRACT_TYPE_DEFINITIONS,
  ContractGroup,
  getAvailableContractTypes,
  getContractTypesByGroup,
} from '@/types/campaign/contracts/contractTypes';
import { IContract } from '@/types/campaign/Mission';

import {
  CONTRACT_GROUP_WEIGHTS,
  CONTRACT_TYPES,
  DURATION_MAX_DAYS,
  DURATION_MIN_DAYS,
  EMPLOYER_FACTIONS,
  SALVAGE_MAX_PERCENT,
  SALVAGE_MIN_PERCENT,
  SYSTEMS,
} from './contractMarketConstants';
import {
  defaultRandom,
  pickRandom,
  randomInt,
  RandomFn,
} from './contractRandomHelpers';

/**
 * Generate a contract name from type and employer.
 *
 * Clans and mercenary units do not take a "House" prefix, so the faction is
 * classified before formatting to keep generated names lore-accurate.
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
 * Generate a unique contract ID.
 *
 * Combines a timestamp with a short random suffix so concurrently generated
 * contracts in the same millisecond still get distinct IDs.
 *
 * @returns Unique contract ID string
 */
export function generateContractId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `contract-${timestamp}-${random}`;
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
 * The employer is filtered out first so a faction is never contracted to
 * attack itself.
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
 *
 * First selects a group weighted by CONTRACT_GROUP_WEIGHTS, then uniformly
 * selects a type within that group. The two-stage roll keeps common garrison
 * work frequent and guerrilla work rare without per-type weights.
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
 * A contract type chosen for a followup contract.
 *
 * `atbType` is set only when the completed contract was an AtB contract;
 * `typeName` is always the human-readable name used to build the new contract.
 */
export interface FollowupTypeSelection {
  /** Display name of the selected followup contract type. */
  typeName: string;
  /** AtB contract type, present only when the source contract was AtB. */
  atbType: AtBContractType | undefined;
}

/**
 * Select a contract type for a followup, distinct from the completed contract.
 *
 * For AtB contracts it prefers a different type in the same group and only
 * falls back to any other AtB type when the group has a single member; for
 * legacy contracts it picks a different legacy type. Extracted from
 * generateFollowupContract so the type-distinctness rules live with the other
 * selection logic and the generator stays focused on assembly.
 *
 * @param completedContract - The contract that was just completed
 * @param random - Random function (default: Math.random)
 * @returns The selected followup type name and optional AtB type
 */
export function selectFollowupContractType(
  completedContract: IContract,
  random: RandomFn = defaultRandom,
): FollowupTypeSelection {
  if (completedContract.atbContractType) {
    // AtB contract: pick a different type from the same group
    const completedDef =
      CONTRACT_TYPE_DEFINITIONS[completedContract.atbContractType];
    const groupTypes = getContractTypesByGroup(completedDef.group);
    const otherTypes = groupTypes.filter(
      (t) => t !== completedContract.atbContractType,
    );

    let atbType: AtBContractType;
    if (otherTypes.length > 0) {
      atbType = pickRandom(otherTypes, random);
    } else {
      // Only one type in group, pick any different AtB type
      const allTypes = getAvailableContractTypes().filter(
        (t) => t !== completedContract.atbContractType,
      );
      atbType = pickRandom(allTypes, random);
    }
    return { typeName: CONTRACT_TYPE_DEFINITIONS[atbType].name, atbType };
  }

  // Legacy contract: pick a different legacy type
  const completedType = CONTRACT_TYPES.find((t) =>
    completedContract.name.includes(t),
  );
  const otherTypes = CONTRACT_TYPES.filter((t) => t !== completedType);
  return { typeName: pickRandom(otherTypes, random), atbType: undefined };
}
