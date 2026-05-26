import { IHexCoordinate, RangeBracket } from '@/types/gameplay';

import { hexDistance } from '../hexMath';
import { getWeaponRangeBracket, IWeaponRangeProfile } from '../range';
import { getUnitNetwork } from './state';
import {
  IC3NetworkState,
  IC3NetworkUnit,
  IC3TargetingOptions,
  IC3TargetingResult,
} from './types';

/**
 * Get the best range bracket to a target from all operational, non-ECM-disrupted
 * units in the attacker's C3 network.
 *
 * This is the core C3 targeting mechanic: the attacker uses the best range bracket
 * among all operational networked units.
 *
 * @param attackerEntityId - The attacking unit's entity ID
 * @param targetPosition - Target hex position
 * @param weaponRangeProfile - The weapon's range profile
 * @param c3State - Battlefield C3 network state
 * @param attackerEcmDisrupted - Whether the attacker is ECM-disrupted
 *   (overrides the per-unit flag; for callers who compute ECM externally)
 * @returns C3 targeting result with best bracket and spotter info
 */
export function getC3TargetingBenefit(
  attackerEntityId: string,
  targetPosition: IHexCoordinate,
  weaponRangeProfile: IWeaponRangeProfile,
  c3State: IC3NetworkState,
  attackerEcmDisrupted?: boolean,
  options?: IC3TargetingOptions,
): IC3TargetingResult {
  const noBenefit = (reason: string): IC3TargetingResult => ({
    benefitApplied: false,
    bestBracket: RangeBracket.OutOfRange,
    spotterId: null,
    spotterRange: null,
    denialReason: reason,
  });

  // Find the attacker's network
  const network = getUnitNetwork(c3State, attackerEntityId);
  if (!network) {
    return noBenefit('Unit is not in a C3 network');
  }

  const attackerUnit = network.members.find(
    (m) => m.entityId === attackerEntityId,
  );
  if (!attackerUnit || !attackerUnit.operational) {
    return noBenefit('Attacker unit is not operational');
  }

  // Check ECM disruption on the attacker
  const isDisrupted =
    attackerEcmDisrupted !== undefined
      ? attackerEcmDisrupted
      : attackerUnit.ecmDisrupted;

  if (isDisrupted) {
    return noBenefit('C3 Network disrupted by ECM');
  }

  // Gather all operational, non-disrupted network members
  const activeMembers = network.members.filter(
    (m) => m.operational && !m.ecmDisrupted,
  );

  const candidateMembers = filterMembersBySpotterLineOfSight(
    activeMembers,
    attackerEntityId,
    options,
  );

  if (candidateMembers.length < 2) {
    if (options?.requireSpotterTargetLineOfSight && activeMembers.length >= 2) {
      return noBenefit('No C3 spotter has target line of sight');
    }
    return noBenefit('Not enough active units in network');
  }

  // Find the best range bracket among all active network members
  let bestBracket: RangeBracket = RangeBracket.OutOfRange;
  let bestDistance = Infinity;
  let spotterId: string | null = null;

  for (const member of candidateMembers) {
    const distance = hexDistance(member.position, targetPosition);
    const bracket = getWeaponRangeBracket(distance, weaponRangeProfile);

    if (isBetterBracket(bracket, bestBracket)) {
      bestBracket = bracket;
      bestDistance = distance;
      spotterId = member.entityId;
    } else if (bracket === bestBracket && distance < bestDistance) {
      // Same bracket but closer — prefer closer spotter
      bestDistance = distance;
      spotterId = member.entityId;
    }
  }

  if (bestBracket === RangeBracket.OutOfRange) {
    return noBenefit('No networked unit has target in range');
  }

  // Check if benefit actually improves the attacker's own bracket
  const attackerDistance = hexDistance(attackerUnit.position, targetPosition);
  const attackerBracket = getWeaponRangeBracket(
    attackerDistance,
    weaponRangeProfile,
  );

  if (!isBetterBracket(bestBracket, attackerBracket)) {
    return {
      benefitApplied: false,
      bestBracket: attackerBracket,
      spotterId: null,
      spotterRange: null,
      denialReason: null,
    };
  }

  return {
    benefitApplied: true,
    bestBracket,
    spotterId,
    spotterRange: bestDistance,
    denialReason: null,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function filterMembersBySpotterLineOfSight(
  members: readonly IC3NetworkUnit[],
  attackerEntityId: string,
  options?: IC3TargetingOptions,
): readonly IC3NetworkUnit[] {
  if (!options?.requireSpotterTargetLineOfSight) {
    return members;
  }

  return members.filter((member) => {
    if (member.entityId === attackerEntityId) {
      return true;
    }

    return options.spotterHasTargetLineOfSight?.(member) === true;
  });
}

/** Range bracket ordering (lower index = better/closer) */
const BRACKET_ORDER: readonly RangeBracket[] = [
  RangeBracket.Short,
  RangeBracket.Medium,
  RangeBracket.Long,
  RangeBracket.Extreme,
  RangeBracket.OutOfRange,
];

/**
 * Returns true if `a` is a strictly better (closer) range bracket than `b`.
 */
export function isBetterBracket(a: RangeBracket, b: RangeBracket): boolean {
  return BRACKET_ORDER.indexOf(a) < BRACKET_ORDER.indexOf(b);
}
