/**
 * Campaign Bay Actions — integration tests
 *
 * Covers tasks.md 5.6 (accept/decline persists status), 3.5 (priority
 * reorder persists the ordinal), and 6.2 (bay mutations mark the campaign
 * dirty so the persistence store auto-saves).
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';

import { DamageLevel } from '@/types/campaign/Salvage';

import {
  reorderRepairTicketPriority,
  setSalvageItemStatus,
} from '../campaignBayActions';
import { selectRepairBay, selectSalvageBay } from '../campaignBaySelectors';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import { resetCampaignStore, useCampaignStore } from '../useCampaignStore';

// =============================================================================
// Fixtures
// =============================================================================

function makeRepairTicket(
  overrides: Partial<IRepairTicket> = {},
): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-atlas',
    kind: 'armor',
    location: 'CT',
    expectedHours: 6,
    partsRequired: [],
    source: 'combat',
    matchId: 'match-1',
    createdAt: '3025-01-01T00:00:00.000Z',
    status: 'queued',
    ...overrides,
  };
}

function makeAllocation(): ISalvageAllocation {
  const candidate = {
    source: 'unit' as const,
    unitId: 'enemy-atlas',
    designation: 'Atlas AS7-D',
    destroyedFromBattle: 'match-1',
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
      battleId: 'match-1',
      contractId: 'contract-1',
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

/**
 * Seed the live campaign store with a campaign carrying a repair queue
 * and a salvage allocation.
 */
function seedCampaign(): ICampaign {
  const store = useCampaignStore();
  store.getState().createCampaign('Test', 'mercenary');
  const base = store.getState().getCampaign();
  if (!base) throw new Error('campaign not created');

  const seeded = {
    ...base,
    repairQueue: [
      makeRepairTicket({ ticketId: 'ticket-1' }),
      makeRepairTicket({ ticketId: 'ticket-2', expectedHours: 12 }),
      makeRepairTicket({ ticketId: 'ticket-3', expectedHours: 18 }),
    ],
    salvageAllocations: { 'match-1': makeAllocation() },
  } as Partial<ICampaign>;

  store.getState().updateCampaign(seeded);
  return store.getState().getCampaign() as ICampaign;
}

// =============================================================================
// Tests
// =============================================================================

describe('campaignBayActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
    resetCampaignStore();
  });

  describe('reorderRepairTicketPriority', () => {
    it('writes ascending priority ordinals onto the named tickets', () => {
      seedCampaign();
      const result = reorderRepairTicketPriority([
        'ticket-3',
        'ticket-1',
        'ticket-2',
      ]);
      expect(result.applied).toBe(true);

      const campaign = useCampaignStore()
        .getState()
        .getCampaign() as ICampaign & {
        repairQueue?: readonly IRepairTicket[];
      };
      const byId = new Map(
        (campaign.repairQueue ?? []).map((t) => [t.ticketId, t.priority]),
      );
      expect(byId.get('ticket-3')).toBe(0);
      expect(byId.get('ticket-1')).toBe(1);
      expect(byId.get('ticket-2')).toBe(2);
    });

    it('marks the campaign dirty so the persistence store auto-saves', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      reorderRepairTicketPriority(['ticket-1', 'ticket-2', 'ticket-3']);
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('does not change ticket content — only work order', () => {
      seedCampaign();
      reorderRepairTicketPriority(['ticket-2', 'ticket-1']);
      const repairBay = selectRepairBay(
        useCampaignStore().getState().getCampaign(),
      );
      // The projected bay still carries every ticket's original content.
      const ticket1 = repairBay.find((t) => t.ticketId === 'ticket-1');
      expect(ticket1?.kind).toBe('armor');
      expect(ticket1?.expectedHours).toBe(6);
    });

    it('reports applied=false when no campaign is loaded', () => {
      const result = reorderRepairTicketPriority(['ticket-1']);
      expect(result.applied).toBe(false);
    });
  });

  describe('setSalvageItemStatus', () => {
    it('flips a pending candidate to accepted on the salvage state', () => {
      seedCampaign();
      const result = setSalvageItemStatus('salvage-atlas', 'accepted');
      expect(result.applied).toBe(true);

      const salvageBay = selectSalvageBay(
        useCampaignStore().getState().getCampaign(),
      );
      const item = salvageBay.find((s) => s.partId === 'salvage-atlas');
      expect(item?.status).toBe('accepted');
    });

    it('flips a candidate to declined', () => {
      seedCampaign();
      setSalvageItemStatus('salvage-atlas', 'declined');
      const salvageBay = selectSalvageBay(
        useCampaignStore().getState().getCampaign(),
      );
      expect(salvageBay.find((s) => s.partId === 'salvage-atlas')?.status).toBe(
        'declined',
      );
    });

    it('marks the campaign dirty so the persistence store auto-saves', () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      setSalvageItemStatus('salvage-atlas', 'accepted');
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('re-projects the inventory so the bay reflects the change immediately', () => {
      seedCampaign();
      // Before: no inventory has been projected yet (the day-advancement
      // processor has not run), so the selector yields an empty bay.
      let salvageBay = selectSalvageBay(
        useCampaignStore().getState().getCampaign(),
      );
      expect(salvageBay).toEqual([]);

      setSalvageItemStatus('salvage-atlas', 'accepted');

      // After: the bay action re-projected the inventory off the mutated
      // salvage state — the candidate now shows as accepted without
      // waiting for the next day advancement (design D5).
      salvageBay = selectSalvageBay(
        useCampaignStore().getState().getCampaign(),
      );
      expect(salvageBay.find((s) => s.partId === 'salvage-atlas')?.status).toBe(
        'accepted',
      );
    });

    it('reports applied=false when no campaign is loaded', () => {
      const result = setSalvageItemStatus('salvage-atlas', 'accepted');
      expect(result.applied).toBe(false);
    });
  });
});
