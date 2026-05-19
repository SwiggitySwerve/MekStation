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

import {
  SAMPLE_MEDICAL_BAY,
  SAMPLE_REPAIR_BAY,
  SAMPLE_SALVAGE_BAY,
} from '@/components/campaign/bays/__fixtures__/bayFixtures';
import { createCampaign } from '@/types/campaign/Campaign';

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
