import type { IRepairTicket } from '@/types/campaign/RepairTicket';

import { createCampaign, createContract } from '@/types/campaign/Campaign';
import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { PersonnelMarketStyle } from '@/types/campaign/markets/marketTypes';

import { buildStarmapSystemLenses } from '../starmapTravelLenses';
import { buildStarmapTravelPreview } from '../starmapTravelPreview';
import { DEFAULT_STARMAP_TRAVEL_RULES } from '../starmapTravelRules';

function makeCampaign() {
  return {
    ...createCampaign('Preview Company', 'Davion', {
      startingFunds: 1_000_000,
      payForMaintenance: false,
      payForSalaries: false,
      unitMarketMethod: 'none',
      personnelMarketStyle: PersonnelMarketStyle.DISABLED,
      contractMarketMethod: 'none',
    }),
    id: 'campaign-preview',
    currentDate: new Date('3025-01-01T00:00:00.000Z'),
    currentSystemId: 'terra',
    updatedAt: '3025-01-01T00:00:00.000Z',
  };
}

describe('starmap travel preview', () => {
  it('builds a pure rules-backed route preview without mutating campaign state', () => {
    const campaign = makeCampaign();
    const preview = buildStarmapTravelPreview(campaign, 'luthien', {
      generatedAt: '3025-01-01T12:00:00.000Z',
    });

    expect(preview.status).toBe('ready');
    expect(preview.fromSystem.name).toBe('Terra');
    expect(preview.destinationSystem?.name).toBe('Luthien');
    expect(preview.jumpCount).toBe(10);
    expect(preview.elapsedDays).toBe(72);
    expect(preview.routeLegs).toHaveLength(10);
    expect(preview.routeLegs.every((leg) => leg.status === 'legal')).toBe(true);
    expect(campaign.currentSystemId).toBe('terra');
    expect(campaign.currentDate.toISOString()).toBe('3025-01-01T00:00:00.000Z');
    expect(campaign.finances.balance.amount).toBe(1_000_000);
  });

  it('projects the after-campaign destination, date, fee transaction, and funds', () => {
    const campaign = makeCampaign();
    const preview = buildStarmapTravelPreview(campaign, 'luthien', {
      generatedAt: '3025-01-01T12:00:00.000Z',
    });

    expect(preview.afterCampaign?.currentSystemId).toBe('luthien');
    expect(preview.afterCampaign?.currentDate.toISOString()).toBe(
      preview.arrivalDate,
    );
    expect(preview.afterCampaign?.finances.transactions.at(-1)).toMatchObject({
      type: 'overhead',
      description: expect.stringContaining('Travel fee from Terra to Luthien'),
    });
    expect(preview.afterCampaign?.finances.balance.amount).toBe(
      preview.projectedFunds.amount,
    );
    expect(preview.projectedFunds.amount).toBeLessThan(
      campaign.finances.balance.amount,
    );
  });

  it('summarizes repair progress from pure travel-day processors', () => {
    const repairTicket: IRepairTicket = {
      ticketId: 'repair-rt',
      unitId: 'atlas-1',
      kind: 'armor',
      location: 'RT',
      pointsToRestore: 4,
      expectedHours: 16,
      remainingHours: 16,
      partsRequired: [],
      source: 'combat',
      matchId: 'match-1',
      createdAt: '3025-01-01T00:00:00.000Z',
      status: 'queued',
    };
    const campaign = { ...makeCampaign(), repairQueue: [repairTicket] };

    const preview = buildStarmapTravelPreview(campaign, 'outreach', {
      generatedAt: '3025-01-01T12:00:00.000Z',
    });

    expect(preview.status).toBe('ready');
    expect(preview.progressSummary.repairProgressEvents).toBeGreaterThan(0);
    expect(preview.progressSummary.repairCompletedEvents).toBe(1);
    expect(preview.afterCampaign?.repairQueue?.[0]).toMatchObject({
      ticketId: 'repair-rt',
      status: 'completed',
      remainingHours: 0,
    });
  });

  it('warns when arrival misses a destination contract deadline', () => {
    const contract = createContract({
      id: 'contract-luthien',
      name: 'Luthien Relief',
      employerId: 'Davion',
      targetId: 'Kurita',
      systemId: 'luthien',
      status: MissionStatus.ACTIVE,
      endDate: '3025-01-15',
    });
    const campaign = {
      ...makeCampaign(),
      missions: new Map([[contract.id, contract]]),
    };

    const preview = buildStarmapTravelPreview(campaign, 'luthien', {
      generatedAt: '3025-01-01T12:00:00.000Z',
    });

    expect(preview.deadlineWarnings).toHaveLength(1);
    expect(preview.deadlineWarnings[0]).toMatchObject({
      missionId: 'contract-luthien',
      missionName: 'Luthien Relief',
      systemId: 'luthien',
    });
    expect(preview.deadlineWarnings[0].daysLate).toBeGreaterThan(0);
  });

  it('blocks route approval when custom travel rules make the order illegal', () => {
    const campaign = makeCampaign();
    const preview = buildStarmapTravelPreview(campaign, 'luthien', {
      generatedAt: '3025-01-01T12:00:00.000Z',
      rules: {
        ...DEFAULT_STARMAP_TRAVEL_RULES,
        maxJumpsPerTravelOrder: 1,
      },
    });

    expect(preview.status).toBe('blocked');
    expect(preview.afterCampaign).toBeUndefined();
    expect(preview.reasons.join(' ')).toContain('above the 1-jump');
  });

  it('builds starmap lenses for range, contracts, market quality, and risk', () => {
    const contract = createContract({
      id: 'contract-luthien',
      name: 'Luthien Relief',
      employerId: 'Davion',
      targetId: 'Kurita',
      systemId: 'luthien',
      status: MissionStatus.ACTIVE,
      endDate: '3025-01-15',
    });
    const campaign = {
      ...makeCampaign(),
      missions: new Map([[contract.id, contract]]),
    };

    const lenses = buildStarmapSystemLenses(campaign);
    const terra = lenses.find((lens) => lens.systemId === 'terra');
    const luthien = lenses.find((lens) => lens.systemId === 'luthien');

    expect(terra).toMatchObject({
      systemName: 'Terra',
      inSingleJumpRange: true,
      riskLevel: 'low',
    });
    expect(luthien).toMatchObject({
      contractCount: 1,
      riskLevel: 'high',
      marketQuality: 'capital',
    });
    expect(luthien?.badges).toEqual(expect.arrayContaining(['1C', 'DL']));
  });
});
