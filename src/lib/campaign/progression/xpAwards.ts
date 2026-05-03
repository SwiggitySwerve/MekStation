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
 * All award functions take (entry: ICampaignRosterEntry, pilot: IPilot | null)
 * and return IXPAwardEvent for immutable tracking.
 * buildXPAwardDelta converts an event into an IXpAwardDelta for the caller to commit.
 *
 * NPC rule: if pilot === null, award functions return null.
 *
 * @module campaign/progression/xpAwards
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPerson } from '@/types/campaign/Person';
import type {
  IXPAwardEvent,
  IXpAwardDelta,
} from '@/types/campaign/progression/progressionTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

// =============================================================================
// Scenario XP
// =============================================================================

/**
 * Awards XP for scenario participation.
 *
 * NPC rule: if pilot === null, returns null.
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param options - Campaign options (uses scenarioXP)
 * @returns XP award event or null for NPCs
 *
 * @example
 * const event = awardScenarioXP(entry, pilot, options);
 * // { personId: 'p1', source: 'scenario', amount: 1, description: 'Scenario participation' }
 */
export function awardScenarioXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  options: ICampaignOptions,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  const amount = options.scenarioXP ?? 1;
  return {
    personId: entry.pilotId,
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
 * NPC rule: if pilot === null, returns null.
 * Returns null if killCount < threshold.
 * Otherwise: amount = Math.floor(killCount / threshold) * award
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param killCount - Number of kills in this action
 * @param options - Campaign options (uses killsForXP, killXPAward)
 * @returns XP award event or null if below threshold or NPC
 *
 * @example
 * // With threshold=2, award=1, killCount=5:
 * // amount = Math.floor(5/2) * 1 = 2
 * const event = awardKillXP(entry, pilot, 5, options);
 * // { personId: 'p1', source: 'kill', amount: 2, description: '5 kills' }
 *
 * // With threshold=2, killCount=1:
 * const event = awardKillXP(entry, pilot, 1, options);
 * // null (below threshold)
 */
export function awardKillXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  killCount: number,
  options: ICampaignOptions,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  const threshold = options.killsForXP ?? 1;
  const award = options.killXPAward ?? 1;

  if (killCount < threshold) {
    return null;
  }

  const amount = Math.floor(killCount / threshold) * award;
  return {
    personId: entry.pilotId,
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
 * NPC rule: if pilot === null, returns null.
 * Returns null if taskCount < threshold.
 * Otherwise: returns flat award amount.
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param taskCount - Number of tasks completed
 * @param options - Campaign options (uses nTasksXP, taskXP)
 * @returns XP award event or null if below threshold or NPC
 *
 * @example
 * // With threshold=3, award=2, taskCount=5:
 * const event = awardTaskXP(entry, pilot, 5, options);
 * // { personId: 'p1', source: 'task', amount: 2, description: '5 tasks completed' }
 *
 * // With threshold=3, taskCount=2:
 * const event = awardTaskXP(entry, pilot, 2, options);
 * // null (below threshold)
 */
export function awardTaskXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  taskCount: number,
  options: ICampaignOptions,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  const threshold = options.nTasksXP ?? 1;

  if (taskCount < threshold) {
    return null;
  }

  const amount = options.taskXP ?? 1;
  return {
    personId: entry.pilotId,
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
 * NPC rule: if pilot === null, returns null.
 *
 * Amounts vary by outcome:
 * - fail: missionFailXP (default 1)
 * - success: missionSuccessXP (default 3)
 * - outstanding: missionOutstandingXP (default 5)
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param outcome - Mission outcome: 'fail', 'success', or 'outstanding'
 * @param options - Campaign options (uses missionFailXP, missionSuccessXP, missionOutstandingXP)
 * @returns XP award event or null for NPCs
 *
 * @example
 * const event = awardMissionXP(entry, pilot, 'success', options);
 * // { personId: 'p1', source: 'mission', amount: 3, description: 'Mission success' }
 */
export function awardMissionXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  outcome: 'fail' | 'success' | 'outstanding',
  options: ICampaignOptions,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  const amounts = {
    fail: options.missionFailXP ?? 1,
    success: options.missionSuccessXP ?? 3,
    outstanding: options.missionOutstandingXP ?? 5,
  };

  return {
    personId: entry.pilotId,
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
 * NPC rule: if pilot === null, returns null.
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param options - Campaign options (uses vocationalXP)
 * @returns XP award event or null for NPCs
 *
 * @example
 * const event = awardVocationalXP(entry, pilot, options);
 * // { personId: 'p1', source: 'vocational', amount: 1, description: 'Vocational training' }
 */
export function awardVocationalXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  options: ICampaignOptions,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  const amount = options.vocationalXP ?? 1;
  return {
    personId: entry.pilotId,
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
 * NPC rule: if pilot === null, returns null.
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param options - Campaign options (uses adminXP)
 * @returns XP award event or null for NPCs
 *
 * @example
 * const event = awardAdminXP(entry, pilot, options);
 * // { personId: 'p1', source: 'admin', amount: 1, description: 'Administrative duties' }
 */
export function awardAdminXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  options: ICampaignOptions,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  const amount = options.adminXP ?? 0;
  return {
    personId: entry.pilotId,
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
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs)
 * @param options - Campaign options
 * @returns null (not implemented)
 */
export function awardEducationXP(
  _entry: ICampaignRosterEntry,
  _pilot: IPilot | null,
  _options: ICampaignOptions,
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
 * NPC rule: if pilot === null, returns null.
 *
 * @param entry - The roster entry receiving XP
 * @param pilot - The vault pilot (null for NPCs — returns null)
 * @param amount - Amount of XP to award
 * @param description - Description of why XP was awarded
 * @returns XP award event or null for NPCs
 *
 * @example
 * const event = awardManualXP(entry, pilot, 5, 'Special commendation');
 * // { personId: 'p1', source: 'award', amount: 5, description: 'Special commendation' }
 */
export function awardManualXP(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  amount: number,
  description: string,
): IXPAwardEvent | null {
  if (pilot === null) return null;
  return {
    personId: entry.pilotId,
    source: 'award',
    amount,
    description,
  };
}

// =============================================================================
// Build XP Award Delta
// =============================================================================

/**
 * Converts an XP award event into an IXpAwardDelta for the caller to commit.
 *
 * The delta records both the available XP pool increment (xpDelta) and the
 * lifetime earned total increment (campaignXpDelta). The caller applies both
 * fields atomically.
 *
 * @param event - The XP award event from any award function
 * @returns IXpAwardDelta with roster increments
 *
 * @example
 * const event = awardScenarioXP(entry, pilot, options);
 * if (event) {
 *   const delta = buildXPAwardDelta(event);
 *   // caller applies delta.roster.xpDelta to entry.xp
 *   // caller applies delta.roster.campaignXpDelta to entry.campaignXpEarned
 * }
 */
export function buildXPAwardDelta(event: IXPAwardEvent): IXpAwardDelta {
  return {
    vault: null,
    roster: {
      pilotId: event.personId,
      xpDelta: event.amount,
      campaignXpDelta: event.amount,
    },
  };
}

// =============================================================================
// PR2 → PR3 Bridge Shims (DEPRECATED — remove in PR3 when postBattleProcessor
// is migrated to the two-arg (entry, pilot | null) + delta-return pattern)
// =============================================================================

/**
 * @deprecated PR2 bridge shim for postBattleProcessor.ts until PR3 migrates
 * the caller to the new (entry, pilot | null) + buildXPAwardDelta pattern.
 * DO NOT USE in new code. Will be deleted in PR3 task 5.2.
 */
export function applyXPAward(person: IPerson, event: IXPAwardEvent): IPerson {
  return {
    ...person,
    xp: person.xp + event.amount,
    totalXpEarned: person.totalXpEarned + event.amount,
  };
}

/**
 * @deprecated PR2 bridge shim for postBattleProcessor.ts. Use awardScenarioXP
 * (entry, pilot, options) in new code. Will be deleted in PR3 task 5.2.
 */
export function awardScenarioXPLegacy(
  person: IPerson,
  options: ICampaignOptions,
): IXPAwardEvent {
  const amount = options.scenarioXP ?? 1;
  return {
    personId: person.id,
    source: 'scenario',
    amount,
    description: 'Scenario participation',
  };
}

/**
 * @deprecated PR2 bridge shim for postBattleProcessor.ts. Use awardKillXP
 * (entry, pilot, killCount, options) in new code. Will be deleted in PR3 task 5.2.
 */
export function awardKillXPLegacy(
  person: IPerson,
  killCount: number,
  options: ICampaignOptions,
): IXPAwardEvent | null {
  const threshold = options.killsForXP ?? 1;
  const award = options.killXPAward ?? 1;
  if (killCount < threshold) return null;
  return {
    personId: person.id,
    source: 'kill',
    amount: Math.floor(killCount / threshold) * award,
    description: `${killCount} kills`,
  };
}
