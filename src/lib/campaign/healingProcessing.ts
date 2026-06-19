/**
 * Healing Processing - Personnel healing phase of day advancement
 *
 * Extracted from `dayAdvancement.ts` (decompose refactor). Contains the
 * standalone `processHealing` phase used by the legacy `advanceDay` path
 * and by direct unit tests. Production runs this logic through the
 * `healingProcessor` registered in the `DayPipelineRegistry`.
 *
 * Behavior is identical to the pre-refactor implementation — this module
 * is a pure cut/paste of the healing phase with no logic change.
 *
 * @module lib/campaign/healingProcessing
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { ICampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { IInjury } from '@/types/campaign/Person';

import { HealedPersonEvent } from './dayReportTypes';
import { getBestAvailableDoctor } from './medical/doctorCapacity';
import { MedicalSystem } from './medical/medicalTypes';
import { performMedicalCheck } from './medical/performMedicalCheck';

/**
 * Process healing for all wounded roster entries.
 *
 * Per PR4 of `wire-iperson-hard-cutover`: this legacy function reads roster
 * entries directly (no personnel Map) and returns per-pilot patches that
 * the caller commits via `useCampaignRosterStore.applyPilotPatches`.
 * Production uses `healingProcessor` via the DayPipelineRegistry; this
 * standalone function is a thin wrapper kept for the `advanceDay` legacy
 * path and direct unit tests.
 *
 * For each wounded entry:
 * - Use selected medical system to process injuries
 * - Apply medical check results to reduce healing time
 * - Remove injuries where daysToHeal reaches 0
 * - Reduce recoveryTime by 1 (min 0)
 * - If entry is Wounded and all injuries healed + recoveryTime is 0,
 *   transition to Active
 *
 * @param entries - All roster entries (typically `useCampaignRosterStore.getState().pilots`)
 * @param campaign - Campaign with options for doctor assignment
 * @returns Per-pilot patches plus healing events
 */
export function processHealing(
  entries: readonly ICampaignRosterEntry[],
  campaign?: ICampaign,
): {
  patches: Map<string, Partial<ICampaignRosterEntry>>;
  events: HealedPersonEvent[];
} {
  const patches = new Map<string, Partial<ICampaignRosterEntry>>();
  const events: HealedPersonEvent[] = [];

  const medicalSystem =
    campaign?.options.medicalSystem ?? MedicalSystem.STANDARD;
  // Doctor lookup uses ALL entries (for primaryRole=DOCTOR filtering).
  // No vault join in this legacy path — pass empty pilot map (NPCs only).
  const emptyPilots: ReadonlyMap<string, IPilot> = new Map<string, IPilot>();

  for (const entry of entries) {
    if (entry.status !== CampaignPilotStatus.Wounded) continue;

    // Process injuries: apply medical checks, track healed ones
    const healedInjuryIds: string[] = [];
    const updatedInjuries: IInjury[] = [];
    const injuries: readonly IInjury[] = entry.injuries ?? [];

    for (const injury of injuries) {
      if (injury.permanent) {
        // Permanent injuries don't heal
        updatedInjuries.push(injury);
        continue;
      }

      // Get assigned doctor for this patient using new two-arg signature
      const doctorEntry = campaign
        ? getBestAvailableDoctor(entry, entries, emptyPilots, campaign.options)
        : null;

      // Perform medical check using selected system with new two-arg signature
      const medicalResult = campaign
        ? performMedicalCheck({
            system: medicalSystem,
            patientEntry: entry,
            injury,
            doctorEntry,
            doctorPilot: null, // no vault join in this legacy path
            options: campaign.options,
            random: Math.random,
          })
        : null;

      const daysReduced = medicalResult?.healingDaysReduced ?? 1;
      const newDaysToHeal = Math.max(0, injury.daysToHeal - daysReduced);

      if (newDaysToHeal === 0) {
        healedInjuryIds.push(injury.id);
      } else {
        updatedInjuries.push({ ...injury, daysToHeal: newDaysToHeal });
      }
    }

    // Reduce recoveryTime (the roster-entry recovery counter)
    const oldRecoveryTime = entry.recoveryTime ?? 0;
    const newRecoveryTime = Math.max(0, oldRecoveryTime - 1);

    // Check if entry should return to active duty
    const hasHealableInjuries = updatedInjuries.some((i) => !i.permanent);
    const returnedToActive = !hasHealableInjuries && newRecoveryTime === 0;

    // Commit a patch when ANY field changes — recoveryTime decrements
    // even when no injury cleared, so the early-return must consider
    // the recoveryTime delta too. Otherwise wounded pilots would never
    // tick down their recovery clock.
    const recoveryChanged = newRecoveryTime !== oldRecoveryTime;
    const injuriesChanged = healedInjuryIds.length > 0;
    if (!injuriesChanged && !returnedToActive && !recoveryChanged) {
      continue;
    }

    patches.set(entry.pilotId, {
      injuries: updatedInjuries,
      recoveryTime: newRecoveryTime,
      status: returnedToActive ? CampaignPilotStatus.Active : entry.status,
    });

    // Only emit a healing event when something user-visible happened
    // (injury cleared OR returned to active). A silent recovery-time
    // tick stays internal to keep the event log noise-free.
    if (injuriesChanged || returnedToActive) {
      events.push({
        personId: entry.pilotId,
        personName: entry.pilotName,
        healedInjuries: healedInjuryIds,
        returnedToActive,
      });
    }
  }

  return { patches, events };
}
