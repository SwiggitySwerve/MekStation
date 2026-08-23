/**
 * Room-code CampaignJoin must keep working when grant-channel deps exist.
 */

import {
  closeCampaignDeliveryHarness,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  MockWireSocket,
  drain,
  framesOf,
  harnessGrantChannel,
  quietLogger,
} from './campaignGrantChannel.test-helpers';

describe('room-code CampaignJoin with grant channel present', () => {
  it('still streams a snapshot to a room-code guest', async () => {
    const registry = new CampaignHostRegistry();
    await registry.register('match-campaign', {
      campaignId: 'campaign-sync',
      hostPlayerId: 'pid_host',
      roomCode: 'ABC234',
      state: {
        ...createEmptyCampaignState('campaign-sync'),
        balance: 1_000_000,
      },
    });
    const harness = await openCampaignDeliveryHarness();
    try {
      const socket = new MockWireSocket();
      await bindCampaignSyncConnection({
        socket,
        registry,
        matchId: 'match-campaign',
        verifiedPlayerId: 'pid_guest',
        logger: quietLogger,
        grantChannel: harnessGrantChannel(harness),
      });
      const __before1 = socket.sent.length;
      socket.inbound({
        kind: 'CampaignJoin',
        matchId: 'match-campaign',
        ts: nowIso(),
        playerId: 'pid_guest',
        role: 'guest',
        roomCode: 'ABC234',
      });
      await drain(() => socket.sent.length > __before1);
      expect(socket.sent).toContainEqual(
        expect.objectContaining({
          kind: 'CampaignSnapshot',
          matchId: 'match-campaign',
        }),
      );
      expect(framesOf(socket, 'CampaignGrantDelivery')).toHaveLength(0);
    } finally {
      await closeCampaignDeliveryHarness(harness);
      registry.dispose('match-campaign');
    }
  });
});
