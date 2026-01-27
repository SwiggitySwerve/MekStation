/**
 * XP Award Service
 *
 * Implements 8 sources of XP awards for personnel progression:
 * 1. Scenario XP - Participation in battles/scenarios
 * 2. Kill XP - Enemy units destroyed (with threshold)
 * 3. Task XP - Completed objectives (with threshold)
 * 4. Mission XP - Mission completion (fail/success/outstanding)
 * 5. Vocational XP - Vocational training rolls
 * 6. Admin XP - Administrative duties
 * 7. Education XP - Academy training (stubbed)
 * 8. Manual XP - Direct awards
 *
 * All functions return IXPAwardEvent for immutable tracking.
 * applyXPAward applies the event to a person, incrementing both xp and totalXpEarned.
 *
 * @module campaign/progression/xpAwards
 */

import type { IPerson } from '../../../types/campaign/Person';
import type { ICampaignOptions } from '../../../types/campaign/Campaign';
import type { IXPAwardEvent } from '../../../types/campaign/progression/progressionTypes';

// =============================================================================
// Scenario XP
// =============================================================================

/**
 * Awards XP for scenario participation.
 *
 * @param person - The person receiving XP
 * @param options - Campaign options (uses scenarioXP)
 * @returns XP award event
 *
 * @example
 * const event = awardScenarioXP(person, options);
 * // { personId: 'p1', source: 'scenario', amount: 1, description: 'Scenario participation' }
 */
export function awardScenarioXP(
  person: IPerson,
  options: ICampaignOptions
): IXPAwardEvent {
  const amount = options.scenarioXP ?? 1;
  return {
    personId: person.id,
    source: 'scenario',
    amount,
    description: 'Scenario participation',
  };
}

// =============================================================================
// Kill XP
// =============================================================================

/**
 * Awards XP for kills with threshold logic.
 *
 * Returns null if killCount < threshold.
 * Otherwise: amount = Math.floor(killCount / threshold) * award
 *
 * @param person - The person receiving XP
 * @param killCount - Number of kills in this action
 * @param options - Campaign options (uses killsForXP, killXPAward)
 * @returns XP award event or null if below threshold
 *
 * @example
 * // With threshold=2, award=1, killCount=5:
 * // amount = Math.floor(5/2) * 1 = 2
 * const event = awardKillXP(person, 5, options);
 * // { personId: 'p1', source: 'kill', amount: 2, description: '5 kills' }
 *
 * // With threshold=2, killCount=1:
 * const event = awardKillXP(person, 1, options);
 * // null (below threshold)
 */
export function awardKillXP(
  person: IPerson,
  killCount: number,
  options: ICampaignOptions
): IXPAwardEvent | null {
  const threshold = options.killsForXP ?? 1;
  const award = options.killXPAward ?? 1;

  if (killCount < threshold) {
    return null;
  }

  const amount = Math.floor(killCount / threshold) * award;
  return {
    personId: person.id,
    source: 'kill',
    amount,
    description: `${killCount} kills`,
  };
}

// =============================================================================
// Task XP
// =============================================================================

/**
 * Awards XP for task completion with threshold logic.
 *
 * Returns null if taskCount < threshold.
 * Otherwise: returns flat award amount.
 *
 * @param person - The person receiving XP
 * @param taskCount - Number of tasks completed
 * @param options - Campaign options (uses nTasksXP, taskXP)
 * @returns XP award event or null if below threshold
 *
 * @example
 * // With threshold=3, award=2, taskCount=5:
 * const event = awardTaskXP(person, 5, options);
 * // { personId: 'p1', source: 'task', amount: 2, description: '5 tasks completed' }
 *
 * // With threshold=3, taskCount=2:
 * const event = awardTaskXP(person, 2, options);
 * // null (below threshold)
 */
export function awardTaskXP(
  person: IPerson,
  taskCount: number,
  options: ICampaignOptions
): IXPAwardEvent | null {
  const threshold = options.nTasksXP ?? 1;

  if (taskCount < threshold) {
    return null;
  }

  const amount = options.taskXP ?? 1;
  return {
    personId: person.id,
    source: 'task',
    amount,
    description: `${taskCount} tasks completed`,
  };
}

// =============================================================================
// Mission XP
// =============================================================================

/**
 * Awards XP for mission completion with outcome-based amounts.
 *
 * Amounts vary by outcome:
 * - fail: missionFailXP (default 1)
 * - success: missionSuccessXP (default 3)
 * - outstanding: missionOutstandingXP (default 5)
 *
 * @param person - The person receiving XP
 * @param outcome - Mission outcome: 'fail', 'success', or 'outstanding'
 * @param options - Campaign options (uses missionFailXP, missionSuccessXP, missionOutstandingXP)
 * @returns XP award event
 *
 * @example
 * const event = awardMissionXP(person, 'success', options);
 * // { personId: 'p1', source: 'mission', amount: 3, description: 'Mission success' }
 */
export function awardMissionXP(
  person: IPerson,
  outcome: 'fail' | 'success' | 'outstanding',
  options: ICampaignOptions
): IXPAwardEvent {
  const amounts = {
    fail: options.missionFailXP ?? 1,
    success: options.missionSuccessXP ?? 3,
    outstanding: options.missionOutstandingXP ?? 5,
  };

  return {
    personId: person.id,
    source: 'mission',
    amount: amounts[outcome],
    description: `Mission ${outcome}`,
  };
}

// =============================================================================
// Vocational XP
// =============================================================================

/**
 * Awards XP for vocational training.
 *
 * @param person - The person receiving XP
 * @param options - Campaign options (uses vocationalXP)
 * @returns XP award event
 *
 * @example
 * const event = awardVocationalXP(person, options);
 * // { personId: 'p1', source: 'vocational', amount: 1, description: 'Vocational training' }
 */
export function awardVocationalXP(
  person: IPerson,
  options: ICampaignOptions
): IXPAwardEvent {
  const amount = options.vocationalXP ?? 1;
  return {
    personId: person.id,
    source: 'vocational',
    amount,
    description: 'Vocational training',
  };
}

// =============================================================================
// Admin XP
// =============================================================================

/**
 * Awards XP for administrative duties.
 *
 * @param person - The person receiving XP
 * @param options - Campaign options (uses adminXP)
 * @returns XP award event
 *
 * @example
 * const event = awardAdminXP(person, options);
 * // { personId: 'p1', source: 'admin', amount: 1, description: 'Administrative duties' }
 */
export function awardAdminXP(
  person: IPerson,
  options: ICampaignOptions
): IXPAwardEvent {
  const amount = options.adminXP ?? 0;
  return {
    personId: person.id,
    source: 'admin',
    amount,
    description: 'Administrative duties',
  };
}

// =============================================================================
// Education XP
// =============================================================================

/**
 * Awards XP for education/academy training.
 *
 * @stub - Not implemented (no academy system)
 *
 * @param person - The person receiving XP
 * @param options - Campaign options
 * @returns null (not implemented)
 */
export function awardEducationXP(
  person: IPerson,
  options: ICampaignOptions
): IXPAwardEvent | null {
  // @stub - Education system not implemented
  return null;
}

// =============================================================================
// Manual XP
// =============================================================================

/**
 * Awards XP manually with custom description.
 *
 * @param person - The person receiving XP
 * @param amount - Amount of XP to award
 * @param description - Description of why XP was awarded
 * @returns XP award event
 *
 * @example
 * const event = awardManualXP(person, 5, 'Special commendation');
 * // { personId: 'p1', source: 'award', amount: 5, description: 'Special commendation' }
 */
export function awardManualXP(
  person: IPerson,
  amount: number,
  description: string
): IXPAwardEvent {
  return {
    personId: person.id,
    source: 'award',
    amount,
    description,
  };
}

// =============================================================================
// Apply XP Award
// =============================================================================

/**
 * Applies an XP award event to a person.
 *
 * Immutably updates the person by:
 * - Incrementing xp (available XP pool)
 * - Incrementing totalXpEarned (lifetime total)
 *
 * @param person - The person receiving the award
 * @param event - The XP award event to apply
 * @returns Updated person with incremented XP fields
 *
 * @example
 * const event = awardScenarioXP(person, options);
 * const updated = applyXPAward(person, event);
 * // updated.xp = person.xp + event.amount
 * // updated.totalXpEarned = person.totalXpEarned + event.amount
 */
export function applyXPAward(person: IPerson, event: IXPAwardEvent): IPerson {
  return {
    ...person,
    xp: person.xp + event.amount,
    totalXpEarned: person.totalXpEarned + event.amount,
  };
}
