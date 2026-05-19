/**
 * Tests for the campaign inventory projection.
 *
 * Per `add-campaign-combat-loop` task 5.3: projection from a populated
 * post-battle campaign yields the expected `ICampaignInventory`; an
 * empty campaign yields an empty inventory with zeroed summary.
 *
 * @spec openspec/changes/add-campaign-combat-loop/specs/campaign-combat-loop/spec.md
 */

import { describe, expect, it } from '@jest/globals';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type { ISalvageAllocation } from '@/types/campaign/Salvage';

import {
  projectCampaignInventory,
  type ICampaignForInventory,
} from '@/lib/campaign/inventory/projectCampaignInventory';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';
import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { Money } from '@/types/campaign/Money';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const GENERATED_AT = '3025-06-15T00:00:00.000Z';

function makeCampaign(
  overrides?: Partial<ICampaignForInventory>,
): ICampaignForInventory {
  const base: ICampaign = {
    id: 'campaign-inv-1',
    name: 'Inventory Test Co.',
    currentDate: new Date('3025-06-15T00:00:00Z'),
    factionId: 'mercenary',
    forces: new Map(),
    rootForceId: 'root',
    missions: new Map(),
    finances: { transactions: [], balance: Money.ZERO },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    shoppingList: { items: [] },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    unitCombatStates: {},
  };
  return { ...base, ...overrides };
}

function makeRepairTicket(overrides?: Partial<IRepairTicket>): IRepairTicket {
  return {
    ticketId: 'ticket-1',
    unitId: 'unit-A',
    kind: 'armor',
    location: 'CT',
    pointsToRestore: 10,
    expectedHours: 1,
    partsRequired: [
      { partId: 'standard-armor-pt', quantity: 10, matched: true },
    ],
    source: 'combat',
    matchId: 'match-1',
    createdAt: GENERATED_AT,
    status: 'queued',
    ...overrides,
  };
}

function makeRosterEntry(
  overrides?: Partial<ICampaignRosterEntry>,
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-1',
    pilotName: 'Strix',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 0,
    campaignXpEarned: 0,
    campaignKills: 0,
    campaignMissions: 0,
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    hireDate: new Date('3024-01-01'),
    ...overrides,
  };
}

function makeAllocation(): ISalvageAllocation {
  return {
    pool: {
      battleId: 'match-1',
      contractId: 'contract-1',
      candidates: [],
      totalEstimatedValue: 0,
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
      candidates: [
        {
          source: 'unit',
          unitId: 'enemy-1',
          designation: 'Atlas AS7-D',
          destroyedFromBattle: 'match-1',
          finalStatus: 'crippled',
          damageLevel: 'heavy' as never,
          originalValue: 400_000,
          recoveredValue: 100_000,
          recoveryPercentage: 0.25,
          repairCostEstimate: 300_000,
          disposition: 'mercenary',
          status: 'pending',
        },
      ],
      totalValue: 100_000,
      estimatedRepairCost: 300_000,
    },
    splitMethod: 'contract',
    processed: true,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('projectCampaignInventory', () => {
  it('an empty campaign yields an empty inventory with zeroed summary', () => {
    const inventory = projectCampaignInventory(
      makeCampaign(),
      [],
      GENERATED_AT,
    );
    expect(inventory.campaignId).toBe('campaign-inv-1');
    expect(inventory.generatedAt).toBe(GENERATED_AT);
    expect(inventory.repairBay).toEqual([]);
    expect(inventory.salvageBay).toEqual([]);
    expect(inventory.medicalBay).toEqual([]);
    expect(inventory.summary).toEqual({
      repairTicketCount: 0,
      totalRepairHours: 0,
      salvageValueTotal: 0,
      pilotsInMedical: 0,
    });
  });

  it('projects every repair ticket as an IRepairBayItem', () => {
    const campaign = makeCampaign({
      repairQueue: [
        makeRepairTicket({ ticketId: 't-1', expectedHours: 2 }),
        makeRepairTicket({
          ticketId: 't-2',
          kind: 'component',
          location: 'RA',
          expectedHours: 4,
          status: 'parts-needed',
          partsRequired: [{ partId: 'AC/20', quantity: 1, matched: false }],
        }),
      ],
    });
    const inventory = projectCampaignInventory(campaign, [], GENERATED_AT);

    expect(inventory.repairBay).toHaveLength(2);
    const t1 = inventory.repairBay.find((i) => i.ticketId === 't-1');
    expect(t1?.partsReady).toBe(true);
    expect(t1?.status).toBe('queued');
    const t2 = inventory.repairBay.find((i) => i.ticketId === 't-2');
    expect(t2?.partsReady).toBe(false);
    expect(t2?.status).toBe('parts-needed');
    expect(t2?.location).toBe('RA');

    expect(inventory.summary.repairTicketCount).toBe(2);
    expect(inventory.summary.totalRepairHours).toBe(6);
  });

  it('cancelled repair tickets are dropped from the bay', () => {
    const campaign = makeCampaign({
      repairQueue: [
        makeRepairTicket({ ticketId: 't-live' }),
        makeRepairTicket({ ticketId: 't-cancelled', status: 'cancelled' }),
      ],
    });
    const inventory = projectCampaignInventory(campaign, [], GENERATED_AT);
    expect(inventory.repairBay.map((i) => i.ticketId)).toEqual(['t-live']);
  });

  it('completed tickets map to status "done"', () => {
    const campaign = makeCampaign({
      repairQueue: [makeRepairTicket({ status: 'completed' })],
    });
    const inventory = projectCampaignInventory(campaign, [], GENERATED_AT);
    expect(inventory.repairBay[0].status).toBe('done');
  });

  it('projects mercenary salvage candidates as ISalvageBayItems and totals their value', () => {
    const campaign = makeCampaign({
      salvageAllocations: { 'match-1': makeAllocation() },
    });
    const inventory = projectCampaignInventory(campaign, [], GENERATED_AT);

    expect(inventory.salvageBay).toHaveLength(1);
    const item = inventory.salvageBay[0];
    expect(item.partId).toBe('enemy-1');
    expect(item.sourceUnitId).toBe('enemy-1');
    expect(item.designation).toBe('Atlas AS7-D');
    expect(item.recoveredValue).toBe(100_000);
    expect(item.disposition).toBe('mercenary');
    expect(item.status).toBe('pending');

    expect(inventory.summary.salvageValueTotal).toBe(100_000);
  });

  it('projects every injured pilot as an IMedicalBayItem; active pilots are excluded', () => {
    const inventory = projectCampaignInventory(
      makeCampaign(),
      [
        makeRosterEntry({
          pilotId: 'p-active',
          status: CampaignPilotStatus.Active,
        }),
        makeRosterEntry({
          pilotId: 'p-wounded',
          pilotName: 'Volkov',
          status: CampaignPilotStatus.Wounded,
          wounds: 1,
          recoveryTime: 4,
        }),
        makeRosterEntry({
          pilotId: 'p-critical',
          pilotName: 'Kerr',
          status: CampaignPilotStatus.Critical,
          wounds: 5,
          recoveryTime: 20,
        }),
        makeRosterEntry({
          pilotId: 'p-kia',
          pilotName: 'Doss',
          status: CampaignPilotStatus.KIA,
          wounds: 6,
          recoveryTime: 0,
        }),
      ],
      GENERATED_AT,
    );

    expect(inventory.medicalBay).toHaveLength(3);
    const wounded = inventory.medicalBay.find((i) => i.pilotId === 'p-wounded');
    expect(wounded?.injuryLevel).toBe('light');
    expect(wounded?.daysToRecover).toBe(4);
    expect(wounded?.status).toBe('recovering');

    const critical = inventory.medicalBay.find(
      (i) => i.pilotId === 'p-critical',
    );
    expect(critical?.injuryLevel).toBe('critical');

    const kia = inventory.medicalBay.find((i) => i.pilotId === 'p-kia');
    expect(kia?.injuryLevel).toBe('kia');
    expect(kia?.status).toBe('discharged');

    expect(inventory.summary.pilotsInMedical).toBe(3);
  });

  it('escalates a heavily-wounded pilot from light to serious', () => {
    const inventory = projectCampaignInventory(
      makeCampaign(),
      [
        makeRosterEntry({
          pilotId: 'p-heavy',
          status: CampaignPilotStatus.Wounded,
          wounds: 4,
          recoveryTime: 10,
        }),
      ],
      GENERATED_AT,
    );
    expect(inventory.medicalBay[0].injuryLevel).toBe('serious');
  });

  it('a recovered pilot with no recovery time left is marked ready', () => {
    const inventory = projectCampaignInventory(
      makeCampaign(),
      [
        makeRosterEntry({
          pilotId: 'p-ready',
          status: CampaignPilotStatus.Wounded,
          wounds: 1,
          recoveryTime: 0,
        }),
      ],
      GENERATED_AT,
    );
    expect(inventory.medicalBay[0].status).toBe('ready');
  });
});
