/**
 * Healing Day Processor
 *
 * Processes daily healing for all wounded personnel using the configured
 * medical system. Reads entries from useCampaignRosterStore + usePilotStore
 * (PR3 task 5.2); write-side stays on campaign.personnel until PR4.
 *
 * For each entry with Wounded status:
 * - Find best available doctor via getBestAvailableDoctor
 * - Run performMedicalCheck for each non-permanent injury
 * - Decrement daysToHeal by healingDaysReduced
 * - Remove injuries where daysToHeal reaches 0
 * - Reduce recoveryTime (daysToWaitForHealing) by 1
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

import { personToMinimalEntry } from '@/lib/campaign/utils/personToRosterEntry';
import { buildPilotLookup } from '@/lib/campaign/utils/pilotLookup';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { usePilotStore } from '@/stores/usePilotStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';

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
function processEntryHealing(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  allEntries: readonly ICampaignRosterEntry[],
  pilotsByPilotId: ReadonlyMap<string, IPilot>,
  system: MedicalSystem,
  campaign: ICampaign,
): {
  updatedInjuries: IInjury[];
  healedInjuryIds: string[];
  newRecoveryTime: number;
  returnedToActive: boolean;
} {
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

    const medResult = performMedicalCheck(
      system,
      entry,
      injury,
      doctorEntry,
      doctorPilot,
      campaign.options,
      Math.random,
    );

    const daysReduced = medResult.healingDaysReduced;
    const newDaysToHeal = Math.max(0, injury.daysToHeal - daysReduced);

    if (newDaysToHeal === 0) {
      healedInjuryIds.push(injury.id);
    } else {
      updatedInjuries.push({ ...injury, daysToHeal: newDaysToHeal });
    }
  }

  // Decrement recovery time (maps to IPerson.daysToWaitForHealing)
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

  process(campaign: ICampaign): IDayProcessorResult {
    // Pre-join vault once per run (O(N) build, O(1) lookups).
    const __storeEntries = useCampaignRosterStore.getState().pilots;
    const rosterEntries: readonly ICampaignRosterEntry[] =
      __storeEntries.length > 0
        ? __storeEntries
        : Array.from(campaign.personnel.values()).map(personToMinimalEntry);
    const vault = usePilotStore.getState().pilots;
    const pilotsByPilotId = buildPilotLookup(vault);

    const system = campaign.options.medicalSystem ?? MedicalSystem.STANDARD;

    const events: IDayEvent[] = [];
    // Write-side stays on campaign.personnel until PR4.
    const updatedPersonnel = new Map(campaign.personnel);

    for (const entry of rosterEntries) {
      if (entry.status !== CampaignPilotStatus.Wounded) continue;

      const pilot = pilotsByPilotId.get(entry.pilotId) ?? null;

      const {
        updatedInjuries,
        healedInjuryIds,
        newRecoveryTime,
        returnedToActive,
      } = processEntryHealing(
        entry,
        pilot,
        rosterEntries,
        pilotsByPilotId,
        system,
        campaign,
      );

      if (healedInjuryIds.length === 0 && !returnedToActive) continue;

      // Write results back to campaign.personnel (write-side: stays until PR4)
      const person = updatedPersonnel.get(entry.pilotId);
      if (person) {
        updatedPersonnel.set(entry.pilotId, {
          ...person,
          injuries: updatedInjuries,
          daysToWaitForHealing: newRecoveryTime,
          status: returnedToActive ? PersonnelStatus.ACTIVE : person.status,
          updatedAt: new Date().toISOString(),
        });
      }

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

    return {
      events,
      campaign: { ...campaign, personnel: updatedPersonnel },
    };
  },
};
