import {
  IFactionStanding,
  IRegardChangeEvent,
  FactionStandingLevel,
  REGARD_DELTAS,
  getStandingLevel,
} from '../../../types/campaign/factionStanding/IFactionStanding';

/**
 * Adjusts a faction's regard by a delta amount.
 *
 * @param standing The current standing
 * @param delta The regard change amount
 * @param reason The reason for the change
 * @param date The date of the change
 * @param regardMultiplier Optional multiplier to apply to delta (default 1)
 * @returns Updated standing with new regard, level, and history entry
 */
export function adjustRegard(
  standing: IFactionStanding,
  delta: number,
  reason: string,
  date: Date,
  regardMultiplier: number = 1,
): IFactionStanding {
  const previousRegard = standing.regard;
  const previousLevel = standing.level;

  // Apply multiplier and clamp to [-60, +60]
  const adjustedDelta = delta * regardMultiplier;
  const newRegard = Math.max(-60, Math.min(60, previousRegard + adjustedDelta));
  const newLevel = getStandingLevel(newRegard);

  // Create change event
  const changeEvent: IRegardChangeEvent = {
    date,
    delta: adjustedDelta,
    reason,
    previousRegard,
    newRegard,
    previousLevel,
    newLevel,
  };

  // Return updated standing with new history
  return {
    ...standing,
    regard: newRegard,
    level: newLevel,
    lastChangeDate: date,
    history: [...standing.history, changeEvent],
  };
}

/**
 * Processes daily decay of regard toward zero.
 *
 * @param standing The current standing
 * @param date The date of decay
 * @returns Updated standing with decayed regard
 */
export function processRegardDecay(
  standing: IFactionStanding,
  date: Date,
): IFactionStanding {
  const { regard } = standing;

  // No decay at zero
  if (regard === 0) {
    return standing;
  }

  let newRegard: number;

  if (regard > 0) {
    // Positive regard decays downward
    newRegard = Math.max(0, regard - REGARD_DELTAS.DAILY_DECAY);
  } else {
    // Negative regard decays upward
    newRegard = Math.min(0, regard + REGARD_DELTAS.DAILY_DECAY);
  }

  // Record decay as a change event
  return adjustRegard(standing, newRegard - regard, 'Daily Decay', date);
}

/**
 * Processes a contract outcome and adjusts faction standings.
 *
 * @param standings Map of faction standings
 * @param employerFactionId The employer faction
 * @param targetFactionId Optional target faction (if different from employer)
 * @param outcome The contract outcome
 * @param date The date of the contract
 * @returns Updated standings map
 */
export function processContractOutcome(
  standings: Record<string, IFactionStanding>,
  employerFactionId: string,
  targetFactionId: string | undefined,
  outcome: 'success' | 'partial' | 'failure' | 'breach',
  date: Date,
): Record<string, IFactionStanding> {
  const updated = { ...standings };

  // Get delta for outcome
  const delta =
    outcome === 'success'
      ? REGARD_DELTAS.CONTRACT_SUCCESS
      : outcome === 'partial'
        ? REGARD_DELTAS.CONTRACT_PARTIAL
        : outcome === 'failure'
          ? REGARD_DELTAS.CONTRACT_FAILURE
          : REGARD_DELTAS.CONTRACT_BREACH;

  // Adjust employer standing
  const employerStanding =
    updated[employerFactionId] || createDefaultStanding(employerFactionId);
  updated[employerFactionId] = adjustRegard(
    employerStanding,
    delta,
    `Contract ${outcome}`,
    date,
  );

  // Adjust target standing if different from employer
  if (targetFactionId && targetFactionId !== employerFactionId) {
    const targetStanding =
      updated[targetFactionId] || createDefaultStanding(targetFactionId);
    // Target loses standing with reduced magnitude (0.5x)
    const targetDelta = delta * -0.5;
    updated[targetFactionId] = adjustRegard(
      targetStanding,
      targetDelta,
      `Contract ${outcome} (opposing)`,
      date,
    );
  }

  return updated;
}

/**
 * Creates a default neutral standing for a faction.
 *
 * @param factionId The faction ID
 * @returns A new neutral standing
 */
export function createDefaultStanding(factionId: string): IFactionStanding {
  return {
    factionId,
    regard: 0,
    level: FactionStandingLevel.LEVEL_4,
    accoladeLevel: 0,
    censureLevel: 0,
    history: [],
  };
}
