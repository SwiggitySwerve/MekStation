/**
 * Contract Negotiation System
 * 
 * Implements the AtB contract clause negotiation mechanics.
 * Each contract has 4 negotiation clauses (Command, Salvage, Support, Transport),
 * each with levels 0-3. Negotiation rolls use 2d6 + skill + faction standing modifiers.
 *
 * Based on MekHQ's AbstractContractMarket clause negotiation.
 * 
 * @module campaign/contracts/contractNegotiation
 */

import {
  ContractClauseType,
  IContractClause,
  CLAUSE_LEVELS,
} from '@/types/campaign/contracts/contractTypes';

/** Random number generator function type. Returns [0, 1). */
export type RandomFn = () => number;

/**
 * Roll 2d6 using an injectable random function.
 * Each die produces 1-6, total range 2-12.
 */
export function roll2d6(random: RandomFn): number {
  const die1 = Math.floor(random() * 6) + 1;
  const die2 = Math.floor(random() * 6) + 1;
  return die1 + die2;
}

/**
 * Negotiate a single contract clause.
 * 
 * Formula: roll 2d6 + negotiatorSkill + factionStandingMod
 * Result mapping to level:
 *   result < 4  → level 0
 *   4 ≤ result < 7  → level 1
 *   7 ≤ result < 10 → level 2
 *   result ≥ 10 → level 3
 * 
 * Levels are clamped to [0, 3].
 * 
 * @param clauseType - Type of clause to negotiate
 * @param negotiatorSkill - Negotiation skill modifier (typically 0-3)
 * @param factionStandingMod - Faction standing modifier (can be negative)
 * @param random - Injectable random function
 * @returns Negotiated contract clause with level
 */
export function negotiateClause(
  clauseType: ContractClauseType,
  negotiatorSkill: number,
  factionStandingMod: number,
  random: RandomFn
): IContractClause {
  const roll = roll2d6(random);
  const totalResult = roll + negotiatorSkill + factionStandingMod;
  
  let level: 0 | 1 | 2 | 3;
  if (totalResult < 4) {
    level = 0;
  } else if (totalResult < 7) {
    level = 1;
  } else if (totalResult < 10) {
    level = 2;
  } else {
    level = 3;
  }
  
  return { type: clauseType, level };
}

/**
 * Negotiate all 4 contract clauses.
 * Returns an array of 4 clauses, one for each ContractClauseType.
 * 
 * @param negotiatorSkill - Negotiation skill modifier
 * @param factionStandingMod - Faction standing modifier
 * @param random - Injectable random function
 * @returns Array of 4 negotiated contract clauses
 */
export function negotiateAllClauses(
  negotiatorSkill: number,
  factionStandingMod: number,
  random: RandomFn
): IContractClause[] {
  return Object.values(ContractClauseType).map((clauseType) =>
    negotiateClause(clauseType, negotiatorSkill, factionStandingMod, random)
  );
}

/**
 * Get the display name of a clause at its negotiated level.
 * 
 * @param clause - The negotiated clause
 * @returns Display name string
 */
export function getClauseLevelName(clause: IContractClause): string {
  return CLAUSE_LEVELS[clause.type][clause.level].name;
}

/**
 * Get the description of a clause at its negotiated level.
 * 
 * @param clause - The negotiated clause
 * @returns Description string
 */
export function getClauseLevelDescription(clause: IContractClause): string {
  return CLAUSE_LEVELS[clause.type][clause.level].description;
}
