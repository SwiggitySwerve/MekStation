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
 * @module campaign/processors/vocationalTrainingProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
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
 * Checks if a person is eligible for vocational training.
 * Must be: ACTIVE, not a child, not a dependent, not a prisoner.
 */
function isEligibleForVocational(person: IPerson, campaignDate: Date): boolean {
  // Must be ACTIVE
  if (person.status !== PersonnelStatus.ACTIVE) {
    return false;
  }

  // Not a dependent
  if (person.primaryRole === CampaignPersonnelRole.DEPENDENT) {
    return false;
  }

  // Not a child (under 13 years old)
  if (person.birthDate) {
    const birthDate = person.birthDate instanceof Date ? person.birthDate : new Date(person.birthDate);
    const age = campaignDate.getFullYear() - birthDate.getFullYear();
    if (age < 13) {
      return false;
    }
  }

  return true;
}

/**
 * Applies vocational training results to campaign.
 * Updates personnel timers and applies XP awards.
 */
function applyVocationalResults(
  campaign: ICampaign,
  events: IDayEvent[],
): ICampaign {
  if (events.length === 0) {
    return campaign;
  }

  // Build map of personId -> XP amount to award
  const xpAwards = new Map<string, number>();
  for (const event of events) {
    const personId = event.data?.personId as string | undefined;
    const amount = event.data?.amount as number | undefined;
    if (personId && amount) {
      xpAwards.set(personId, (xpAwards.get(personId) ?? 0) + amount);
    }
  }

  // Apply XP awards to personnel
  const updatedPersonnel = new Map(campaign.personnel);
  Array.from(xpAwards.entries()).forEach(([personId, xpAmount]) => {
    const person = updatedPersonnel.get(personId);
    if (person) {
      updatedPersonnel.set(personId, {
        ...person,
        xp: person.xp + xpAmount,
        totalXpEarned: person.totalXpEarned + xpAmount,
      });
    }
  });

  return {
    ...campaign,
    personnel: updatedPersonnel,
  };
}

// =============================================================================
// Main Processor Function
// =============================================================================

/**
 * Processes vocational training for all eligible personnel.
 * Returns updated campaign and events describing what happened.
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

  // Update timers and process checks
  const updatedPersonnel = new Map(campaign.personnel);

  Array.from(campaign.personnel.values()).forEach((person) => {
    if (!isEligibleForVocational(person, campaign.currentDate)) {
      return;
    }

    const timer = (person.traits?.vocationalXPTimer ?? 0) + 1;

    if (timer >= checkFrequency) {
      // Roll 2d6 vs TN
      const roll = roll2d6(random);

      if (roll >= targetNumber) {
        events.push({
          type: 'vocational',
          description: `Vocational training (rolled ${roll} vs TN ${targetNumber})`,
          severity: 'info',
          data: {
            personId: person.id,
            amount: vocationalXP,
            roll,
            targetNumber,
          },
        });
      }

      // Reset timer regardless of success
      updatedPersonnel.set(person.id, {
        ...person,
        traits: {
          ...person.traits,
          vocationalXPTimer: 0,
        },
      });
    } else {
      // Increment timer
      updatedPersonnel.set(person.id, {
        ...person,
        traits: {
          ...person.traits,
          vocationalXPTimer: timer,
        },
      });
    }
  });

  const campaignWithTimers = {
    ...campaign,
    personnel: updatedPersonnel,
  };

  const updatedCampaign = applyVocationalResults(campaignWithTimers, events);

  return { updatedCampaign, events };
}

// =============================================================================
// Day Processor Implementation
// =============================================================================

export const vocationalTrainingProcessor: IDayProcessor = {
  id: 'vocational-training',
  phase: DayPhase.EVENTS,
  displayName: 'Vocational Training',

  process(campaign: ICampaign): IDayProcessorResult {
    const { updatedCampaign, events } = processVocationalTraining(campaign, Math.random);
    return { events, campaign: updatedCampaign };
  },
};

/**
 * Registers the vocational training processor in the day pipeline.
 */
export function registerVocationalTrainingProcessor(): void {
  getDayPipeline().register(vocationalTrainingProcessor);
}
