/**
 * Genesis-seeded guest hydration (task 3.5 empty-state trap).
 */

import type { ICampaignGrantDeliveryItem } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { foldCampaignGrantDeliveryItems } from '@/lib/campaign/delivery/foldCampaignGrantDelivery';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  buildRoomCodeGuestHydration,
  composeRoomCodeGuestState,
  grantCursorFromReplicaCursor,
  genesisStateFromHostLog,
} from '../roomCodeGuestHydration';

const CAMPAIGN_ID = 'campaign-hydrate';
const TS = '2026-08-22T16:30:00.000Z';

/** Host-log genesis snapshot used as the empty-state-trap fixture. */
function genesis(balance: number): ICampaignEvent {
  return {
    type: 'CampaignSnapshotPublished',
    sequence: 0,
    campaignId: CAMPAIGN_ID,
    ts: TS,
    authorPlayerId: 'pid_host',
    scope: 'campaign',
    payload: {
      state: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance,
        rosterUnits: {
          'unit-1': {
            unitId: 'unit-1',
            designation: 'Atlas',
            status: 'operational',
          },
        },
      },
    },
  };
}

describe('composeRoomCodeGuestState', () => {
  it('keeps genesis funds when the projector skipped the stored baseline', () => {
    const state = composeRoomCodeGuestState(
      CAMPAIGN_ID,
      [genesis(1_000_000)],
      [],
    );
    expect(state.balance).toBe(1_000_000);
    expect(state.rosterUnits['unit-1']?.designation).toBe('Atlas');
    expect(genesisStateFromHostLog([genesis(1_000_000)])?.balance).toBe(
      1_000_000,
    );
  });

  it('folds in-scope incrementals onto genesis', () => {
    const items: readonly ICampaignGrantDeliveryItem[] = [
      {
        deliverySequence: 1,
        event: {
          type: 'CampaignDayAdvanced',
          campaignId: CAMPAIGN_ID,
          ts: TS,
          authorPlayerId: 'pid_host',
          scope: 'campaign',
          payload: { newDay: 4 },
        },
      },
    ];
    const state = composeRoomCodeGuestState(
      CAMPAIGN_ID,
      [genesis(500_000)],
      items,
    );
    expect(state.balance).toBe(500_000);
    expect(state.day).toBe(4);
  });

  it('maps replica cursor 1 back to projector afterSequence 0', () => {
    expect(
      grantCursorFromReplicaCursor({
        deliveryEpochId: 'epoch-a',
        afterSequence: 1,
      }),
    ).toEqual({ deliveryEpochId: 'epoch-a', afterSequence: 0 });
  });

  it('folds replica hydration items to the composed guest state', () => {
    const items: readonly ICampaignGrantDeliveryItem[] = [
      {
        deliverySequence: 1,
        event: {
          type: 'CampaignDayAdvanced',
          campaignId: CAMPAIGN_ID,
          ts: TS,
          authorPlayerId: 'pid_host',
          scope: 'campaign',
          payload: { newDay: 4 },
        },
      },
    ];
    const hydration = buildRoomCodeGuestHydration(
      CAMPAIGN_ID,
      [genesis(500_000)],
      items,
      'epoch-a',
      TS,
      'pid_host',
    );
    expect(
      foldCampaignGrantDeliveryItems(CAMPAIGN_ID, hydration.replicaItems),
    ).toEqual(hydration.state);
    expect(hydration.state.day).toBe(4);
    expect(hydration.state.balance).toBe(500_000);
  });
});
