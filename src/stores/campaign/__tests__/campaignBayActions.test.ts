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
import type { IForce } from '@/types/campaign/Force';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';

import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { prepareSalvageUnitRecovery } from '@/lib/campaign/salvage/salvageUnitRecovery';
import { getCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { mapRawIndexEntry } from '@/services/units/unitIndexMapper';
import { ForceRole, FormationLevel } from '@/types/campaign/enums';
import { DamageLevel } from '@/types/campaign/Salvage';
import {
  UnitFinalStatus,
  PilotFinalStatus,
} from '@/types/combat/CombatOutcome';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';

import {
  reorderRepairTicketPriority,
  setSalvageItemStatus,
} from '../campaignBayActions';
import { selectRepairBay, selectSalvageBay } from '../campaignBaySelectors';
import { useCampaignPersistenceStore } from '../useCampaignPersistenceStore';
import { useCampaignRosterStore } from '../useCampaignRosterStore';
import {
  resetCampaignStore,
  useCampaignStore as getCampaignStore,
} from '../useCampaignStore';

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

function makeForce(id: string): IForce {
  return {
    id,
    name: 'Root Force',
    parentForceId: undefined,
    subForceIds: [],
    unitIds: [],
    forceType: ForceRole.STANDARD,
    formationLevel: FormationLevel.LANCE,
    createdAt: '3025-01-01T00:00:00.000Z',
    updatedAt: '3025-01-01T00:00:00.000Z',
  };
}

function makeAllocation(): ISalvageAllocation {
  const candidate = {
    source: 'unit' as const,
    recovery: prepareSalvageUnitRecovery(
      {
        unitId: 'enemy-atlas',
        unitRef: 'atlas-as7-d',
        unitSource: 'canonical',
        side: GameSide.Opponent,
        destroyed: true,
        finalStatus: UnitFinalStatus.Destroyed,
        armorRemaining: { CT: 0 },
        internalsRemaining: { CT: 0 },
        destroyedLocations: ['CT'],
        destroyedComponents: [],
        heatEnd: 0,
        ammoRemaining: {},
        pilotState: {
          conscious: true,
          wounds: 0,
          killed: false,
          finalStatus: PilotFinalStatus.Active,
        },
      },
      'match-1',
      '2026-11-07T00:00:00Z',
    ),
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

function makePartAllocation(): ISalvageAllocation {
  const candidate = {
    source: 'part' as const,
    unitId: 'enemy-hunchback',
    designation: 'AC/20',
    destroyedFromBattle: 'match-2',
    finalStatus: 'destroyed' as const,
    damageLevel: DamageLevel.Moderate,
    originalValue: 300_000,
    recoveredValue: 150_000,
    recoveryPercentage: 0.5,
    repairCostEstimate: 0,
    partId: 'ac20',
    location: 'RT',
    disposition: 'mercenary' as const,
    status: 'pending' as const,
  };
  return {
    pool: {
      battleId: 'match-2',
      contractId: 'contract-1',
      candidates: [candidate],
      totalEstimatedValue: 150_000,
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
      totalValue: 150_000,
      estimatedRepairCost: 0,
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
  const store = getCampaignStore();
  store.getState().createCampaign('Test', 'mercenary');
  const base = store.getState().getCampaign();
  if (!base) throw new Error('campaign not created');
  useCampaignRosterStore.getState().initRoster(base.id);

  const seeded = {
    ...base,
    forces: new Map([[base.rootForceId, makeForce(base.rootForceId)]]),
    repairQueue: [
      makeRepairTicket({ ticketId: 'ticket-1' }),
      makeRepairTicket({ ticketId: 'ticket-2', expectedHours: 12 }),
      makeRepairTicket({ ticketId: 'ticket-3', expectedHours: 18 }),
    ],
    salvageAllocations: {
      'match-1': makeAllocation(),
      'match-2': makePartAllocation(),
    },
  } as Partial<ICampaign>;

  store.getState().switchCampaign({ ...base, ...seeded });
  return store.getState().getCampaign() as ICampaign;
}

// =============================================================================
// Tests
// =============================================================================

describe('campaignBayActions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.localStorage.clear();
    resetCampaignStore();
    useCampaignRosterStore.getState().reset();
    useCampaignPersistenceStore.getState().reset();
    jest.spyOn(getCanonicalUnitService(), 'getIndex').mockResolvedValue([
      mapRawIndexEntry({
        id: 'atlas-as7-d',
        chassis: 'Atlas',
        model: 'AS7-D',
        tonnage: 100,
        techBase: 'INNER_SPHERE',
        path: 'fixture.json',
      }),
    ]);
    jest
      .spyOn(useCampaignPersistenceStore.getState(), 'saveCampaign')
      .mockImplementation(async () => ({
        status: 'saved',
        record: buildSerializedCampaign(
          getCampaignStore().getState().campaign!,
          'test-device',
          1,
        ),
      }));
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.restoreAllMocks();
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

      const campaign = getCampaignStore()
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
        getCampaignStore().getState().getCampaign(),
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
    it('flips a pending candidate to accepted on the salvage state', async () => {
      seedCampaign();
      const result = await setSalvageItemStatus('salvage-atlas', 'accepted');
      expect(result.applied).toBe(true);

      const salvageBay = selectSalvageBay(
        getCampaignStore().getState().getCampaign(),
      );
      const item = salvageBay.find((s) => s.partId === 'salvage-atlas');
      expect(item?.status).toBe('accepted');
    });

    it('flips a candidate to declined', () => {
      seedCampaign();
      setSalvageItemStatus('salvage-atlas', 'declined');
      const salvageBay = selectSalvageBay(
        getCampaignStore().getState().getCampaign(),
      );
      expect(salvageBay.find((s) => s.partId === 'salvage-atlas')?.status).toBe(
        'declined',
      );
    });

    it('marks the campaign dirty before saving enrollment', async () => {
      seedCampaign();
      expect(useCampaignPersistenceStore.getState().dirty).toBe(false);
      await setSalvageItemStatus('salvage-atlas', 'accepted');
      expect(useCampaignPersistenceStore.getState().dirty).toBe(true);
    });

    it('adds an accepted salvage unit to the root force exactly once', async () => {
      seedCampaign();

      await setSalvageItemStatus('salvage-atlas', 'accepted');
      await setSalvageItemStatus('salvage-atlas', 'accepted');

      const campaign = getCampaignStore().getState().getCampaign() as ICampaign;
      const rootForce = campaign.forces.get(campaign.rootForceId);
      expect(rootForce?.unitIds).toEqual(['enemy-atlas']);
      expect(
        useCampaignRosterStore.getState().units.map((unit) => unit.unitId),
      ).toEqual(['enemy-atlas']);
    });

    it('adds an accepted salvage part into partsInventory', () => {
      seedCampaign();

      setSalvageItemStatus('ac20', 'accepted');

      const campaign = getCampaignStore()
        .getState()
        .getCampaign() as ICampaign & {
        readonly partsInventory?: readonly {
          readonly inventoryId: string;
          readonly partId: string;
          readonly partName: string;
          readonly quantity: number;
          readonly source: string;
        }[];
      };
      expect(campaign.partsInventory).toEqual([
        expect.objectContaining({
          inventoryId: 'salvage-match-2-ac20',
          partId: 'ac20',
          partName: 'AC/20',
          quantity: 1,
          source: 'salvage',
        }),
      ]);
    });

    it('re-projects the inventory so the bay reflects the change immediately', async () => {
      seedCampaign();
      // Before: no inventory has been attached yet, but the render-facing
      // selector re-projects from persisted salvage state so a reload still
      // shows the bay.
      let salvageBay = selectSalvageBay(
        getCampaignStore().getState().getCampaign(),
      );
      expect(salvageBay.find((s) => s.partId === 'salvage-atlas')?.status).toBe(
        'pending',
      );

      await setSalvageItemStatus('salvage-atlas', 'accepted');

      // After: the bay action re-projects the inventory off the mutated
      // salvage state — the candidate now shows as accepted without
      // waiting for the next day advancement (design D5).
      salvageBay = selectSalvageBay(
        getCampaignStore().getState().getCampaign(),
      );
      expect(salvageBay.find((s) => s.partId === 'salvage-atlas')?.status).toBe(
        'accepted',
      );
    });

    it('reports applied=false when no campaign is loaded', async () => {
      const result = await setSalvageItemStatus('salvage-atlas', 'accepted');
      expect(result.applied).toBe(false);
    });
  });
});
