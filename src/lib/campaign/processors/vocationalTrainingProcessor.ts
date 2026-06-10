/**
 * Vocational Training Day Processor
 *
 * Implements monthly vocational training checks for personnel.
 * Each eligible person gets a 2d6 roll vs target number every 30 days.
 * Success awards vocational XP; failure awards nothing.
 * Timer resets after check regardless of outcome.
 *
 * Based on MekHQ CampaignNewDayManager.java:1882-1915
 *
 * NPC behavior: SKIP — pilot===null means NPC with no vault identity;
 * vault-only per Council #2 NPC domain matrix (progression domain).
 *
 * @module campaign/processors/vocationalTrainingProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';

import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
  getDayPipeline,
} from '../dayPipeline';

type RandomFn = () => number;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Rolls 2d6 using injectable random function.
 * Each die is rolled independently: Math.floor(random()*6)+1
 */
function roll2d6(random: RandomFn): number {
  const die1 = Math.floor(random() * 6) + 1;
  const die2 = Math.floor(random() * 6) + 1;
  return die1 + die2;
}

/**
 * Checks if a roster entry is eligible for vocational training.
 *
 * NPC behavior: SKIP if pilot===null (progression domain, vault-only per
 * Council #2 NPC domain matrix).
 *
 * Must be: ACTIVE, not a DEPENDENT, pilot must be resolved (non-null).
 * Birth-date child check is deferred — ICampaignRosterEntry does not carry
 * birthDate; the vault pilot does. With pilot===null for NPCs, children
 * are implicitly excluded via the null guard.
 */
function isEligibleForVocational(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  campaignDate: Date,
): boolean {
  // NPC rule: skip (progression domain)
  if (pilot === null) return false;

  // Must be ACTIVE
  if (entry.status !== CampaignPilotStatus.Active) {
    return false;
  }

  // Not a dependent
  if (entry.primaryRole === CampaignPersonnelRole.DEPENDENT) {
    return false;
  }

  // Child check via vault pilot birth date
  if (pilot.birthDate) {
    const birthDate =
      pilot.birthDate instanceof Date
        ? pilot.birthDate
        : new Date(pilot.birthDate as string);
    const age = campaignDate.getFullYear() - birthDate.getFullYear();
    if (age < 13) {
      return false;
    }
  }

  return true;
}

/**
 * Apply vocational training results to the roster store.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: writes XP + timer updates as
 * roster patches via `applyPilotPatches`. The personnel Map is gone.
 */
function applyVocationalResults(
  campaign: ICampaign,
  events: IDayEvent[],
  timerUpdates: ReadonlyMap<string, number>,
  rosterEntries: readonly ICampaignRosterEntry[],
): ICampaign {
  if (events.length === 0 && timerUpdates.size === 0) {
    return campaign;
  }

  // Build map of personId -> XP amount to award from events
  const xpAwards = new Map<string, number>();
  for (const event of events) {
    const personId = event.data?.personId as string | undefined;
    const amount = event.data?.amount as number | undefined;
    if (personId && amount) {
      xpAwards.set(personId, (xpAwards.get(personId) ?? 0) + amount);
    }
  }

  // Index roster entries for O(1) lookup so we can compute new xp/traits.
  const entryById = new Map(rosterEntries.map((e) => [e.pilotId, e]));
  const patches = new Map<string, Partial<ICampaignRosterEntry>>();
  for (const [personId, timerValue] of Array.from(timerUpdates)) {
    const entry = entryById.get(personId);
    if (!entry) continue;
    const xpAmount = xpAwards.get(personId) ?? 0;
    patches.set(personId, {
      xp: entry.xp + xpAmount,
      campaignXpEarned: entry.campaignXpEarned + xpAmount,
      traits: {
        ...(entry.traits ?? {}),
        vocationalXPTimer: timerValue,
      },
    });
  }

  if (patches.size > 0) {
    useCampaignRosterStore.getState().applyPilotPatches(patches);
  }

  return campaign;
}

// =============================================================================
// Main Processor Function
// =============================================================================

/**
 * Processes vocational training for all eligible personnel.
 * Per PR4 of `wire-iperson-hard-cutover`: reads entries from
 * `useCampaignRosterStore` (canonical source) and commits XP + timer
 * updates as roster patches via `applyPilotPatches`.
 */
export function processVocationalTraining(
  campaign: ICampaign,
  random: RandomFn,
): { updatedCampaign: ICampaign; events: IDayEvent[] } {
  const events: IDayEvent[] = [];
  const options = campaign.options;
  const vocationalXP = options.vocationalXP ?? 1;
  const targetNumber = options.vocationalXPTargetNumber ?? 7;
  const checkFrequency = options.vocationalXPCheckFrequency ?? 30;

  // Pre-join vault once so isEligibleForVocational gets O(1) pilot lookups.
  const rosterEntries = useCampaignRosterStore.getState().pilots;
  const vault = usePilotStore.getState().pilots;
  const pilotsByPilotId = buildPilotLookup(vault);

  // timerUpdates maps pilotId -> new timer value; committed via applyPilotPatches.
  const timerUpdates = new Map<string, number>();

  for (const entry of rosterEntries) {
    const pilot = pilotsByPilotId.get(entry.pilotId) ?? null;

    if (!isEligibleForVocational(entry, pilot, campaign.currentDate)) {
      continue;
    }

    // Read timer from roster entry (PR1.5 added traits to ICampaignRosterEntry).
    const timer = (entry.traits?.vocationalXPTimer ?? 0) + 1;

    if (timer >= checkFrequency) {
      // Roll 2d6 vs TN
      const roll = roll2d6(random);

      if (roll >= targetNumber) {
        events.push({
          type: 'vocational',
          description: `Vocational training (rolled ${roll} vs TN ${targetNumber})`,
          severity: 'info',
          data: {
            personId: entry.pilotId,
            amount: vocationalXP,
            roll,
            targetNumber,
          },
        });
      }

      // Reset timer regardless of success
      timerUpdates.set(entry.pilotId, 0);
    } else {
      // Increment timer
      timerUpdates.set(entry.pilotId, timer);
    }
  }

  const updatedCampaign = applyVocationalResults(
    campaign,
    events,
    timerUpdates,
    rosterEntries,
  );

  return { updatedCampaign, events };
}

// =============================================================================
// Day Processor Implementation
// =============================================================================

export const vocationalTrainingProcessor: IDayProcessor = {
  id: 'vocational-training',
  phase: DayPhase.EVENTS,
  displayName: 'Vocational Training',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    const { updatedCampaign, events } = processVocationalTraining(
      campaign,
      // D-10 (2026-06-09 audit, W3.4): vocational XP rolls draw from the
      // campaign's seeded daily stream so days are replayable.
      createDailyRandom(campaign, date, 'vocational-training'),
    );
    return { events, campaign: updatedCampaign };
  },
};

/**
 * Registers the vocational training processor in the day pipeline.
 */
export function registerVocationalTrainingProcessor(): void {
  getDayPipeline().register(vocationalTrainingProcessor);
}
