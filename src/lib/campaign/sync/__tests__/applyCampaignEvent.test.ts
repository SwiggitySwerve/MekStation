/**
 * Tests for the campaign event reducer (CO1).
 *
 * Each event type advances the authoritative state correctly; the
 * reducer is pure (input never mutated); a snapshot replaces state
 * wholesale.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-reducer';

function withBalance(balance: number): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), balance };
}

function event<T extends ICampaignEvent['type']>(
  type: T,
  sequence: number,
  payload: Extract<ICampaignEvent, { type: T }>['payload'],
): ICampaignEvent {
  return {
    type,
    sequence,
    campaignId: CAMPAIGN_ID,
    ts: '3025-01-01T00:00:00.000Z',
    authorPlayerId: 'host',
    payload,
  } as ICampaignEvent;
}

describe('applyCampaignEvent', () => {
  it('CampaignDayAdvanced sets the new day', () => {
    const next = applyCampaignEvent(
      createEmptyCampaignState(CAMPAIGN_ID),
      event('CampaignDayAdvanced', 0, { newDay: 5 }),
    );
    expect(next.day).toBe(5);
  });

  it('FundsChanged adopts the resulting balance', () => {
    const next = applyCampaignEvent(
      withBalance(1_000_000),
      event('FundsChanged', 0, {
        delta: -250_000,
        reason: 'Repairs',
        balance: 750_000,
      }),
    );
    expect(next.balance).toBe(750_000);
  });

  it('PilotHired adds the pilot to the roster', () => {
    const next = applyCampaignEvent(
      createEmptyCampaignState(CAMPAIGN_ID),
      event('PilotHired', 0, {
        pilot: { pilotId: 'p1', name: 'Pilot One' },
        cost: 10,
      }),
    );
    expect(next.pilots.p1).toEqual({ pilotId: 'p1', name: 'Pilot One' });
  });

  it('ContractAccepted adds the contract', () => {
    const next = applyCampaignEvent(
      createEmptyCampaignState(CAMPAIGN_ID),
      event('ContractAccepted', 0, {
        contract: {
          contractId: 'c1',
          name: 'Raid',
          employerFactionId: 'steiner',
        },
      }),
    );
    expect(next.contracts.c1.name).toBe('Raid');
  });

  it('RosterUnitChanged added/removed mutate the roster', () => {
    const added = applyCampaignEvent(
      createEmptyCampaignState(CAMPAIGN_ID),
      event('RosterUnitChanged', 0, {
        change: 'added',
        unit: {
          unitId: 'u1',
          designation: 'Locust LCT-1V',
          status: 'operational',
        },
      }),
    );
    expect(added.rosterUnits.u1).toBeDefined();

    const removed = applyCampaignEvent(
      added,
      event('RosterUnitChanged', 1, {
        change: 'removed',
        unit: {
          unitId: 'u1',
          designation: 'Locust LCT-1V',
          status: 'destroyed',
        },
      }),
    );
    expect(removed.rosterUnits.u1).toBeUndefined();
  });

  it('SalvageAllocated draws down the pool and may add a unit', () => {
    const state: ICampaignAuthoritativeState = {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      salvagePool: 500_000,
    };
    const next = applyCampaignEvent(
      state,
      event('SalvageAllocated', 0, {
        value: 200_000,
        poolRemaining: 300_000,
        recoveredUnit: {
          unitId: 'salvaged-1',
          designation: 'Shadow Hawk SHD-2H',
          status: 'damaged',
        },
      }),
    );
    expect(next.salvagePool).toBe(300_000);
    expect(next.rosterUnits['salvaged-1'].status).toBe('damaged');
  });

  it('CampaignSnapshotPublished replaces the whole state', () => {
    const baseline: ICampaignAuthoritativeState = {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      day: 42,
      balance: 9_000_000,
    };
    const next = applyCampaignEvent(
      withBalance(1),
      event('CampaignSnapshotPublished', 0, { state: baseline }),
    );
    expect(next).toEqual(baseline);
  });

  it('is pure — the input state is never mutated', () => {
    const input = withBalance(1_000_000);
    const frozen = JSON.parse(JSON.stringify(input));
    applyCampaignEvent(
      input,
      event('FundsChanged', 0, {
        delta: -1,
        reason: 'r',
        balance: 999_999,
      }),
    );
    expect(input).toEqual(frozen);
  });
});
