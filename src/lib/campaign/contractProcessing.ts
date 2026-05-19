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
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { IContract, isContract, IMission } from '@/types/campaign/Mission';

import { ExpiredContractEvent } from './dayReportTypes';

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
    if (mission.status !== MissionStatus.ACTIVE) return;
    if (!mission.endDate) return;

    const endDate = new Date(mission.endDate);
    if (currentDate >= endDate) {
      const updatedContract: IContract = {
        ...mission,
        status: MissionStatus.SUCCESS,
        updatedAt: new Date().toISOString(),
      };

      updatedMissions.set(id, updatedContract);

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
