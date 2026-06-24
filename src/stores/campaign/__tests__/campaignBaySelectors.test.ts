/**
 * Campaign Bay Selectors — unit tests
 *
 * Covers tasks.md 1.3: selectors return the expected projections from a
 * populated campaign and empty arrays / a zeroed summary from a
 * battle-free campaign.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignInventory } from '@/types/campaign/CampaignInventory';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';

import {
  SAMPLE_MEDICAL_BAY,
  SAMPLE_REPAIR_BAY,
  SAMPLE_SALVAGE_BAY,
} from '@/components/campaign/bays/__fixtures__/bayFixtures';
import { createCampaign } from '@/types/campaign/Campaign';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { DamageLevel } from '@/types/campaign/Salvage';

import {
  computeAcceptedSalvageValue,
  groupRepairBayByUnit,
  selectCampaignInventory,
  selectInventorySummary,
  selectMedicalBay,
  selectRepairBay,
  selectRepairTicketCountForUnit,
  selectSalvageBay,
} from '../campaignBaySelectors';

function makeInventory(): ICampaignInventory {
  return {
    campaignId: 'campaign-1',
    generatedAt: '3025-01-01T00:00:00.000Z',
    repairBay: SAMPLE_REPAIR_BAY,
    salvageBay: SAMPLE_SALVAGE_BAY,
    medicalBay: SAMPLE_MEDICAL_BAY,
    summary: {
      repairTicketCount: SAMPLE_REPAIR_BAY.length,
      totalRepairHours: 37,
      salvageValueTotal: 4_260_000,
      pilotsInMedical: SAMPLE_MEDICAL_BAY.length,
    },
  };
}

/** A campaign carrying a projected inventory. */
function populatedCampaign(): ICampaign {
  const base = createCampaign('Test', 'mercenary');
  return { ...base, campaignInventory: makeInventory() } as ICampaign;
}

/** A campaign with no battles fought — no inventory attached. */
function battleFreeCampaign(): ICampaign {
  return createCampaign('Fresh', 'mercenary');
}

function makeRepairTicket(): IRepairTicket {
  return {
    ticketId: 'ticket-reload-ct',
    unitId: 'unit-atlas',
    kind: 'armor',
    location: 'CT',
    expectedHours: 6,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-reload-1',
    createdAt: '3025-01-01T00:00:00.000Z',
    status: 'queued',
  };
}

function makeSalvageAllocation(): ISalvageAllocation {
  const candidate = {
    source: 'unit' as const,
    unitId: 'enemy-atlas',
    designation: 'Atlas AS7-D',
    destroyedFromBattle: 'match-reload-1',
    finalStatus: 'destroyed' as const,
    damageLevel: DamageLevel.Heavy,
    originalValue: 8_000_000,
    recoveredValue: 2_000_000,
    recoveryPercentage: 0.25,
    repairCostEstimate: 500_000,
    partId: 'salvage-atlas',
    disposition: 'mercenary' as const,
    status: 'pending' as const,
  };

  return {
    pool: {
      battleId: 'match-reload-1',
      contractId: 'contract-reload-1',
      candidates: [candidate],
      totalEstimatedValue: 2_000_000,
      hostileTerritory: false,
    },
    employerAward: {
      side: 'employer',
      candidates: [],
      totalValue: 0,
      estimatedRepairCost: 0,
    },
    mercenaryAward: {
      side: 'mercenary',
      candidates: [candidate],
      totalValue: 2_000_000,
      estimatedRepairCost: 500_000,
    },
    splitMethod: 'contract',
    processed: false,
  };
}

function postBattleWithoutAttachedInventory(): ICampaign {
  return {
    ...createCampaign('Reloaded', 'mercenary'),
    repairQueue: [makeRepairTicket()],
    salvageAllocations: { 'match-reload-1': makeSalvageAllocation() },
  } as ICampaign;
}

const RELOADED_ROSTER_PILOTS: readonly ICampaignRosterEntry[] = [
  {
    pilotId: 'pilot-reload-1',
    pilotName: 'Morgan Kell',
    status: CampaignPilotStatus.Wounded,
    wounds: 3,
    recoveryTime: 8,
    xp: 0,
  } as ICampaignRosterEntry,
];

describe('campaignBaySelectors', () => {
  describe('populated campaign', () => {
    const campaign = populatedCampaign();

    it('selectCampaignInventory returns the attached inventory', () => {
      expect(selectCampaignInventory(campaign)).not.toBeNull();
      expect(selectCampaignInventory(campaign)?.campaignId).toBe('campaign-1');
    });

    it('selectRepairBay returns the repair-bay projection', () => {
      expect(selectRepairBay(campaign)).toEqual(SAMPLE_REPAIR_BAY);
    });

    it('selectSalvageBay returns the salvage-bay projection', () => {
      expect(selectSalvageBay(campaign)).toEqual(SAMPLE_SALVAGE_BAY);
    });

    it('selectMedicalBay returns the medical-bay projection', () => {
      expect(selectMedicalBay(campaign)).toEqual(SAMPLE_MEDICAL_BAY);
    });

    it('selectInventorySummary returns the roll-up summary', () => {
      const summary = selectInventorySummary(campaign);
      expect(summary.repairTicketCount).toBe(SAMPLE_REPAIR_BAY.length);
      expect(summary.pilotsInMedical).toBe(SAMPLE_MEDICAL_BAY.length);
    });
  });

  describe('battle-free campaign', () => {
    const campaign = battleFreeCampaign();

    it('selectCampaignInventory returns null', () => {
      expect(selectCampaignInventory(campaign)).toBeNull();
    });

    it('selectRepairBay returns an empty array', () => {
      expect(selectRepairBay(campaign)).toEqual([]);
    });

    it('selectSalvageBay returns an empty array', () => {
      expect(selectSalvageBay(campaign)).toEqual([]);
    });

    it('selectMedicalBay returns an empty array', () => {
      expect(selectMedicalBay(campaign)).toEqual([]);
    });

    it('selectInventorySummary returns a zeroed summary', () => {
      expect(selectInventorySummary(campaign)).toEqual({
        repairTicketCount: 0,
        totalRepairHours: 0,
        salvageValueTotal: 0,
        pilotsInMedical: 0,
      });
    });
  });

  describe('post-battle state without attached inventory', () => {
    const campaign = postBattleWithoutAttachedInventory();

    it('re-projects repair and salvage from persisted canonical state', () => {
      expect(selectCampaignInventory(campaign)).toBeNull();
      expect(selectRepairBay(campaign)).toMatchObject([
        {
          ticketId: 'ticket-reload-ct',
          unitId: 'unit-atlas',
          expectedHours: 6,
          status: 'queued',
        },
      ]);
      expect(selectSalvageBay(campaign)).toMatchObject([
        {
          partId: 'salvage-atlas',
          designation: 'Atlas AS7-D',
          recoveredValue: 2_000_000,
          status: 'pending',
        },
      ]);
    });

    it('re-projects medical state when roster pilots are supplied', () => {
      expect(selectMedicalBay(campaign, RELOADED_ROSTER_PILOTS)).toMatchObject([
        {
          pilotId: 'pilot-reload-1',
          injuryLevel: 'serious',
          daysToRecover: 8,
          status: 'recovering',
        },
      ]);
    });

    it('summarizes the re-projected bays', () => {
      expect(selectInventorySummary(campaign, RELOADED_ROSTER_PILOTS)).toEqual({
        repairTicketCount: 1,
        totalRepairHours: 6,
        salvageValueTotal: 2_000_000,
        pilotsInMedical: 1,
      });
    });
  });

  describe('null campaign', () => {
    it('every selector degrades gracefully', () => {
      expect(selectCampaignInventory(null)).toBeNull();
      expect(selectRepairBay(null)).toEqual([]);
      expect(selectSalvageBay(null)).toEqual([]);
      expect(selectMedicalBay(null)).toEqual([]);
      expect(selectInventorySummary(null).repairTicketCount).toBe(0);
    });
  });

  describe('derived helpers', () => {
    const campaign = populatedCampaign();

    it('selectRepairTicketCountForUnit counts tickets per unit', () => {
      expect(selectRepairTicketCountForUnit(campaign, 'unit-atlas')).toBe(3);
      expect(selectRepairTicketCountForUnit(campaign, 'unit-locust')).toBe(1);
      expect(selectRepairTicketCountForUnit(campaign, 'unit-unknown')).toBe(0);
    });

    it('groupRepairBayByUnit groups items by unitId', () => {
      const grouped = groupRepairBayByUnit(SAMPLE_REPAIR_BAY);
      expect(grouped.get('unit-atlas')?.length).toBe(3);
      expect(grouped.get('unit-locust')?.length).toBe(1);
    });

    it('computeAcceptedSalvageValue sums only accepted items', () => {
      // SAMPLE_SALVAGE_BAY has exactly one `accepted` item at 200_000.
      expect(computeAcceptedSalvageValue(SAMPLE_SALVAGE_BAY)).toBe(200_000);
    });

    it('computeAcceptedSalvageValue excludes declined and pending items', () => {
      const allDeclined = SAMPLE_SALVAGE_BAY.map((item) => ({
        ...item,
        status: 'declined' as const,
      }));
      expect(computeAcceptedSalvageValue(allDeclined)).toBe(0);
    });
  });
});
