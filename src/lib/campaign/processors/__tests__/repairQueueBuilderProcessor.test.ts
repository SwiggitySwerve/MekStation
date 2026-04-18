/**
 * Tests for repairQueueBuilderProcessor.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';

import { CampaignType } from '@/types/campaign/CampaignType';
import { createDefaultCampaignOptions } from '@/types/campaign/createDefaultCampaignOptions';
import { Money } from '@/types/campaign/Money';

import {
  repairQueueBuilderProcessor,
  type ICampaignWithBattleState,
} from '../repairQueueBuilderProcessor';

const TEST_DATE = new Date('2026-04-17T00:00:00.000Z');
const TEST_MATCH_ID = 'match-1';
const UNIT_ID = 'unit-1';

function makeBaseCampaign(): ICampaign {
  return {
    id: 'camp-1',
    name: 'Test Campaign',
    currentDate: TEST_DATE,
    factionId: 'mercenary',
    personnel: new Map(),
    forces: new Map(),
    rootForceId: 'force-root',
    missions: new Map(),
    finances: { transactions: [], balance: new Money(0) },
    factionStandings: {},
    options: createDefaultCampaignOptions(),
    campaignType: CampaignType.MERCENARY,
    createdAt: TEST_DATE.toISOString(),
    updatedAt: TEST_DATE.toISOString(),
  };
}

function makeMaxState(): IUnitMaxState {
  return {
    unitId: UNIT_ID,
    maxArmorPerLocation: { LT: 18, CT: 25 },
    maxStructurePerLocation: { LT: 12, CT: 18 },
    maxAmmoPerBin: { 'ac20-rt': 5 },
  };
}

function makeDamagedState(): IUnitCombatState {
  return {
    unitId: UNIT_ID,
    currentArmorPerLocation: { LT: 13, CT: 25 },
    currentStructurePerLocation: { LT: 12, CT: 18 },
    destroyedLocations: [],
    destroyedComponents: [],
    heatEnd: 4,
    ammoRemaining: { 'ac20-rt': 5 },
    combatReady: true,
    lastCombatOutcomeId: TEST_MATCH_ID,
    lastUpdated: TEST_DATE.toISOString(),
  };
}

describe('repairQueueBuilderProcessor', () => {
  it("registers under id 'repair-queue-builder' in DayPhase.UNITS", () => {
    expect(repairQueueBuilderProcessor.id).toBe('repair-queue-builder');
    // DayPhase.UNITS = 500
    expect(repairQueueBuilderProcessor.phase).toBe(500);
  });

  it('returns the campaign unchanged when there are no pending outcomes', () => {
    const base = makeBaseCampaign();
    const result = repairQueueBuilderProcessor.process(base, TEST_DATE);
    expect(result.events).toEqual([]);
    expect(result.campaign).toBe(base);
  });

  it('appends tickets for a damaged unit and emits a creation event', () => {
    const base: ICampaignWithBattleState = {
      ...makeBaseCampaign(),
      pendingBattleOutcomes: [{ matchId: TEST_MATCH_ID, unitIds: [UNIT_ID] }],
      unitCombatStates: { [UNIT_ID]: makeDamagedState() },
      unitMaxStates: { [UNIT_ID]: makeMaxState() },
    };
    const result = repairQueueBuilderProcessor.process(base, TEST_DATE);
    const queue =
      (result.campaign as ICampaignWithBattleState).repairQueue ?? [];
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe('armor');
    expect(queue[0].location).toBe('LT');
    expect(queue[0].matchId).toBe(TEST_MATCH_ID);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('repair-tickets-created');
    expect(result.events[0].data?.matchId).toBe(TEST_MATCH_ID);
    expect(result.events[0].data?.ticketCount).toBe(1);
  });

  it('is idempotent on (matchId, ticketId) — second run adds no tickets', () => {
    const base: ICampaignWithBattleState = {
      ...makeBaseCampaign(),
      pendingBattleOutcomes: [{ matchId: TEST_MATCH_ID, unitIds: [UNIT_ID] }],
      unitCombatStates: { [UNIT_ID]: makeDamagedState() },
      unitMaxStates: { [UNIT_ID]: makeMaxState() },
    };
    const first = repairQueueBuilderProcessor.process(base, TEST_DATE);
    const firstQueue =
      (first.campaign as ICampaignWithBattleState).repairQueue ?? [];
    expect(firstQueue).toHaveLength(1);

    // Re-run with the queue carried forward; the same ticket IDs must
    // be filtered out so the queue length stays at 1.
    const second = repairQueueBuilderProcessor.process(
      first.campaign,
      TEST_DATE,
    );
    const secondQueue =
      (second.campaign as ICampaignWithBattleState).repairQueue ?? [];
    expect(secondQueue).toHaveLength(1);
    // No new events on the second pass.
    expect(second.events).toEqual([]);
  });

  it('skips units that lack either current state or max state', () => {
    const base: ICampaignWithBattleState = {
      ...makeBaseCampaign(),
      pendingBattleOutcomes: [
        { matchId: TEST_MATCH_ID, unitIds: [UNIT_ID, 'missing-unit'] },
      ],
      unitCombatStates: { [UNIT_ID]: makeDamagedState() },
      unitMaxStates: { [UNIT_ID]: makeMaxState() },
    };
    const result = repairQueueBuilderProcessor.process(base, TEST_DATE);
    const queue =
      (result.campaign as ICampaignWithBattleState).repairQueue ?? [];
    expect(queue).toHaveLength(1);
    expect(queue.every((t) => t.unitId === UNIT_ID)).toBe(true);
  });

  it('preserves existing repair queue entries from prior days', () => {
    const priorTicket: IRepairTicket = {
      ticketId: 'prior-ticket',
      unitId: 'another-unit',
      kind: 'armor',
      location: 'RA',
      pointsToRestore: 3,
      expectedHours: 0.3,
      partsRequired: [
        { partId: 'standard-armor-pt', quantity: 3, matched: false },
      ],
      source: 'manual',
      matchId: null,
      createdAt: TEST_DATE.toISOString(),
      status: 'queued',
    };
    const base: ICampaignWithBattleState = {
      ...makeBaseCampaign(),
      pendingBattleOutcomes: [{ matchId: TEST_MATCH_ID, unitIds: [UNIT_ID] }],
      unitCombatStates: { [UNIT_ID]: makeDamagedState() },
      unitMaxStates: { [UNIT_ID]: makeMaxState() },
      repairQueue: [priorTicket],
    };
    const result = repairQueueBuilderProcessor.process(base, TEST_DATE);
    const queue =
      (result.campaign as ICampaignWithBattleState).repairQueue ?? [];
    // Existing ticket preserved + 1 new combat ticket = 2 total.
    expect(queue).toHaveLength(2);
    expect(queue[0].ticketId).toBe('prior-ticket');
  });
});
