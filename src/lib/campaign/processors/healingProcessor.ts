/**
 * Healing Day Processor
 *
 * Processes daily healing for all wounded personnel using the configured
 * medical system. Per PR4 of `wire-iperson-hard-cutover`: reads entries
 * from `useCampaignRosterStore` (canonical source) and commits per-pilot
 * patches via `applyPilotPatches`. The personnel Map is gone.
 *
 * For each entry with Wounded status:
 * - Find best available doctor via getBestAvailableDoctor
 * - Run performMedicalCheck for each non-permanent injury
 * - Decrement daysToHeal by healingDaysReduced
 * - Remove injuries where daysToHeal reaches 0
 * - Reduce recoveryTime by 1
 * - Return to Active if all healable injuries cleared + recoveryTime == 0
 *
 * NPC behavior: NPCs heal too (medical domain = PROCESS per Council #2 NPC
 * domain matrix). pilot === null is allowed for NPC patients and doctors.
 *
 * @module campaign/processors/healingProcessor
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IInjury } from '@/types/campaign/Person';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { createDailyRandom } from '@/lib/campaign/utils/campaignRng';
import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';

import {
  IDayProcessor,
  IDayProcessorResult,
  DayPhase,
  IDayEvent,
} from '../dayPipeline';
import { getBestAvailableDoctor } from '../medical/doctorCapacity';
import { MedicalSystem } from '../medical/medicalTypes';
import { performMedicalCheck } from '../medical/performMedicalCheck';
import { asEventDataRecord } from '../utils/processorHelpers';

// =============================================================================
// Types
// =============================================================================

/** Healing event emitted for each notable healing outcome. */
interface HealedPersonEvent {
  readonly personId: string;
  readonly personName: string;
  readonly healedInjuries: readonly string[];
  readonly returnedToActive: boolean;
}

interface IEntryHealingContext {
  readonly entry: ICampaignRosterEntry;
  readonly allEntries: readonly ICampaignRosterEntry[];
  readonly pilotsByPilotId: ReadonlyMap<string, IPilot>;
  readonly system: MedicalSystem;
  readonly campaign: ICampaign;
  readonly random: () => number;
}

// =============================================================================
// Core Healing Logic
// =============================================================================

/**
 * Process a single wounded entry against its injuries.
 *
 * Returns the updated injury list, new recoveryTime, whether the entry
 * returned to active, and the list of healed injury IDs. Does NOT mutate
 * the entry — the caller writes the result to campaign.personnel.
 */
function processEntryHealing(context: IEntryHealingContext): {
  updatedInjuries: IInjury[];
  healedInjuryIds: string[];
  newRecoveryTime: number;
  returnedToActive: boolean;
} {
  const { entry, allEntries, pilotsByPilotId, system, campaign, random } =
    context;
  const injuries: readonly IInjury[] = entry.injuries ?? [];
  const healedInjuryIds: string[] = [];
  const updatedInjuries: IInjury[] = [];

  // Find best available doctor once per patient
  const doctorEntry = getBestAvailableDoctor(
    entry,
    allEntries,
    pilotsByPilotId,
    campaign.options,
  );
  const doctorPilot = doctorEntry
    ? (pilotsByPilotId.get(doctorEntry.pilotId) ?? null)
    : null;

  for (const injury of injuries) {
    if (injury.permanent) {
      // Permanent injuries don't heal via daily processing
      updatedInjuries.push(injury);
      continue;
    }

    const medResult = performMedicalCheck({
      system,
      patientEntry: entry,
      injury,
      doctorEntry,
      doctorPilot,
      options: campaign.options,
      // D-10 (2026-06-09 audit, W3.4): the 2d6 medical check draws from
      // the campaign's seeded daily stream so days are replayable.
      random,
    });

    const daysReduced = medResult.healingDaysReduced;
    const newDaysToHeal = Math.max(0, injury.daysToHeal - daysReduced);

    if (newDaysToHeal === 0) {
      healedInjuryIds.push(injury.id);
    } else {
      updatedInjuries.push({ ...injury, daysToHeal: newDaysToHeal });
    }
  }

  // Decrement recovery time (the per-entry recovery counter)
  const newRecoveryTime = Math.max(0, (entry.recoveryTime ?? 0) - 1);

  // Return to active if all healable injuries cleared and recovery complete
  const hasHealableInjuries = updatedInjuries.some((i) => !i.permanent);
  const returnedToActive = !hasHealableInjuries && newRecoveryTime === 0;

  return {
    updatedInjuries,
    healedInjuryIds,
    newRecoveryTime,
    returnedToActive,
  };
}

// =============================================================================
// Day Processor Implementation
// =============================================================================

export const healingProcessor: IDayProcessor = {
  id: 'healing',
  phase: DayPhase.PERSONNEL,
  displayName: 'Personnel Healing',

  process(campaign: ICampaign, date: Date): IDayProcessorResult {
    // Pre-join vault once per run (O(N) build, O(1) lookups).
    // Per PR4: roster store is the canonical entry source.
    const rosterEntries = useCampaignRosterStore.getState().pilots;
    const vault = usePilotStore.getState().pilots;
    const pilotsByPilotId = buildPilotLookup(vault);

    const system = campaign.options.medicalSystem ?? MedicalSystem.STANDARD;
    // D-10 (2026-06-09 audit, W3.4): one seeded stream per (campaign,
    // day, processor) replaces raw Math.random — identical campaign
    // state replays to identical healing outcomes.
    const random = createDailyRandom(campaign, date, 'healing');

    const events: IDayEvent[] = [];
    // Per PR4: collect roster patches and commit once via applyPilotPatches.
    const patches = new Map<string, Partial<ICampaignRosterEntry>>();

    for (const entry of rosterEntries) {
      if (entry.status !== CampaignPilotStatus.Wounded) continue;

      const {
        updatedInjuries,
        healedInjuryIds,
        newRecoveryTime,
        returnedToActive,
      } = processEntryHealing({
        entry,
        allEntries: rosterEntries,
        pilotsByPilotId,
        system,
        campaign,
        random,
      });

      // Commit when ANY field changes — recoveryTime decrements even
      // when no injury cleared, so silent recovery-clock ticks must
      // also produce a patch. Without this gate, wounded pilots would
      // never see their recovery clock advance.
      const recoveryChanged = newRecoveryTime !== (entry.recoveryTime ?? 0);
      const injuriesChanged = healedInjuryIds.length > 0;
      if (!injuriesChanged && !returnedToActive && !recoveryChanged) continue;

      patches.set(entry.pilotId, {
        injuries: updatedInjuries,
        recoveryTime: newRecoveryTime,
        status: returnedToActive ? CampaignPilotStatus.Active : entry.status,
      });

      // Only emit a user-facing event when injuries cleared or status
      // flipped — silent recovery ticks stay out of the event log.
      if (injuriesChanged || returnedToActive) {
        const evt: HealedPersonEvent = {
          personId: entry.pilotId,
          personName: entry.pilotName,
          healedInjuries: healedInjuryIds,
          returnedToActive,
        };

        events.push({
          type: 'healing',
          description: returnedToActive
            ? `${entry.pilotName} returned to active duty`
            : `${entry.pilotName} healed ${healedInjuryIds.length} injury(s)`,
          severity: 'info' as const,
          data: asEventDataRecord(evt),
        });
      }
    }

    if (patches.size > 0) {
      useCampaignRosterStore.getState().applyPilotPatches(patches);
    }

    return { events, campaign };
  },
};
