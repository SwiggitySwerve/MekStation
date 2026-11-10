/**
 * Contract Processing - Contract-expiration phase of day advancement
 *
 * Extracted from `dayAdvancement.ts` (decompose refactor). Contains the
 * standalone `processContracts` phase used by the legacy `advanceDay`
 * path, by the registry `contractProcessor`, and by direct unit tests.
 *
 * Behavior is identical to the pre-refactor implementation — this module
 * is a pure cut/paste of the contract phase with no logic change.
 *
 * @module lib/campaign/contractProcessing
 */

import { ICampaign } from '@/types/campaign/Campaign';
import { isContractInert } from '@/types/campaign/ContractLifecycleRules';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { isContract, IMission } from '@/types/campaign/Mission';

import { ExpiredContractEvent } from './dayReportTypes';
import { transitionMissionStatus } from './missionStatusMachine';

/**
 * Process contract expiration for the campaign.
 *
 * Checks all active contracts against the current date.
 * If a contract's endDate has passed, it is marked as completed (SUCCESS).
 *
 * @param campaign - The campaign to process
 * @returns Updated missions map and expiration events
 */
export function processContracts(campaign: ICampaign): {
  missions: Map<string, IMission>;
  events: ExpiredContractEvent[];
} {
  const updatedMissions = new Map(campaign.missions);
  const events: ExpiredContractEvent[] = [];
  const currentDate = campaign.currentDate;

  Array.from(campaign.missions.entries()).forEach(([id, mission]) => {
    // Only process active contracts with end dates
    if (!isContract(mission)) return;
    // A contract this build cannot process is carried, never expired (S1b).
    if (isContractInert(mission)) return;
    if (mission.status !== MissionStatus.ACTIVE) return;
    if (!mission.endDate) return;

    const endDate = new Date(mission.endDate);
    if (currentDate >= endDate) {
      // Owner ruling D5: expiry settles SUCCESS and pays nothing extra.
      const moved = transitionMissionStatus(
        mission,
        MissionStatus.SUCCESS,
        'expiry',
      );
      if (!moved.ok) return;

      updatedMissions.set(id, moved.mission);

      events.push({
        contractId: id,
        contractName: mission.name,
        previousStatus: mission.status,
        newStatus: MissionStatus.SUCCESS,
      });
    }
  });

  return { missions: updatedMissions, events };
}
