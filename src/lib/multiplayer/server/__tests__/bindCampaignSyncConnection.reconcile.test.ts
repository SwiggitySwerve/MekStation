import { EventEmitter } from 'node:events';

import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { CampaignArtifactUseReader } from '@/lib/interventions/GmCampaignArtifactUseDurable';

import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(): void {
    this.readyState = 3;
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown>): void {
    this.emit('message', JSON.stringify(message));
  }
}

async function makeRegistry(): Promise<CampaignHostRegistry> {
  const registry = new CampaignHostRegistry();
  await registry.register('campaign-sync-match-1', {
    campaignId: 'campaign-1',
    hostPlayerId: 'host-player-1',
    roomCode: 'ABC234',
    state: {
      ...createEmptyCampaignState('campaign-1'),
      balance: 1_000_000,
      rosterUnits: {
        'unit-1': {
          unitId: 'unit-1',
          designation: 'Atlas AS7-D',
          status: 'operational',
        },
      },
    },
  });
  return registry;
}

/**
 * Drain the microtask queue between inbound frames.
 *
 * Raised from 32 when the host's write lock landed: serializing a door
 * costs a promise hop per acquisition, and one reconcile walks three
 * doors, so 32 no longer covered a full reconcile. Starving the flush
 * did not break the dedup - it let the SECOND frame start before the
 * first had recorded the battle, which is a fixed-count-flush artifact
 * rather than a behaviour change.
 */
async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    await Promise.resolve();
  }
}

const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('bindCampaignSyncConnection ReconcileBattle routing', () => {
  it('reconciles a host battle once and broadcasts the committed events to a joined guest', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    const entry = registry.get('campaign-sync-match-1');
    expect(entry).not.toBeNull();
    const host = entry!.host;
    // The three doors used to be three public calls; the walk now takes
    // ONE batch door (finding #78), so the once-ness is proven on it. The
    // committed events below still prove all three doors ran inside it.
    const runBatchExclusive = jest.spyOn(host, 'runBatchExclusive');

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'campaign-sync-match-1',
      verifiedPlayerId: 'host-player-1',
      logger: quietLogger,
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'campaign-sync-match-1',
      verifiedPlayerId: 'guest-player-1',
      logger: quietLogger,
      replicaStore: null,
    });

    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'campaign-sync-match-1',
      ts: nowIso(),
      playerId: 'host-player-1',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'campaign-sync-match-1',
      ts: nowIso(),
      playerId: 'guest-player-1',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guestSocket.sent.length = 0;

    const reconcileBattleFrame = {
      kind: 'CampaignHostIntent' as const,
      matchId: 'campaign-sync-match-1',
      ts: nowIso(),
      playerId: 'host-player-1',
      intent: {
        kind: 'ReconcileBattle' as const,
        campaignId: 'campaign-1',
        intentId: 'coop-recon-combat-match-1',
        payload: {
          campaignId: 'campaign-1',
          matchId: 'combat-match-1',
          fundsDelta: -25_000,
          fundsReason: 'Co-op mission resolution (combat-match-1)',
          salvageValue: 50_000,
          rosterChanges: [
            {
              unitId: 'unit-1',
              designation: 'Atlas AS7-D',
              status: 'destroyed' as const,
            },
          ],
        },
      },
    };

    hostSocket.inbound(reconcileBattleFrame);
    await flushAsyncHandlers();

    const campaignEvents = guestSocket.sent.filter(
      (message) => message.kind === 'CampaignEvent',
    );
    expect(campaignEvents).toHaveLength(3);
    expect(campaignEvents).toEqual([
      expect.objectContaining({
        event: expect.objectContaining({ type: 'FundsChanged' }),
      }),
      expect.objectContaining({
        event: expect.objectContaining({ type: 'SalvageAllocated' }),
      }),
      expect.objectContaining({
        event: expect.objectContaining({ type: 'RosterUnitChanged' }),
      }),
    ]);
    expect(runBatchExclusive).toHaveBeenCalledTimes(1);

    hostSocket.inbound(reconcileBattleFrame);
    await flushAsyncHandlers();

    expect(
      guestSocket.sent.filter((message) => message.kind === 'CampaignEvent'),
    ).toHaveLength(3);
    expect(runBatchExclusive).toHaveBeenCalledTimes(1);
  });

  it('refuses a ReconcileBattle whose matchId is invalidated and applies nothing', async () => {
    const hostSocket = new MockWireSocket();
    const registry = await makeRegistry();
    const entry = registry.get('campaign-sync-match-1');
    expect(entry).not.toBeNull();
    const runBatchExclusive = jest.spyOn(entry!.host, 'runBatchExclusive');
    const artifactUse: CampaignArtifactUseReader = jest.fn(() => ({
      kind: 'invalidated-artifact',
      artifactKind: 'salvage',
      artifactId: 'combat-match-1',
      branchId: 'cand-use-1',
      revision: 3,
    }));

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'campaign-sync-match-1',
      verifiedPlayerId: 'host-player-1',
      logger: quietLogger,
      replicaStore: null,
      artifactUse,
    });

    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'campaign-sync-match-1',
      ts: nowIso(),
      playerId: 'host-player-1',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    hostSocket.sent.length = 0;

    hostSocket.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'campaign-sync-match-1',
      ts: nowIso(),
      playerId: 'host-player-1',
      intent: {
        kind: 'ReconcileBattle',
        campaignId: 'campaign-1',
        intentId: 'coop-recon-combat-match-1',
        payload: {
          campaignId: 'campaign-1',
          matchId: 'combat-match-1',
          fundsDelta: -25_000,
          fundsReason: 'Co-op mission resolution (combat-match-1)',
          salvageValue: 50_000,
          rosterChanges: [],
        },
      },
    });
    await flushAsyncHandlers();

    expect(runBatchExclusive).not.toHaveBeenCalled();
    expect(artifactUse).toHaveBeenCalledWith(
      { streamType: 'campaign', streamId: 'campaign-1' },
      { artifactKind: 'salvage', artifactId: 'combat-match-1' },
    );
    expect(
      hostSocket.sent.filter((message) => message.kind === 'CampaignEvent'),
    ).toHaveLength(0);
    expect(
      hostSocket.sent.filter((message) => message.kind === 'Error'),
    ).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INVALID_INTENT',
        reason: 'invalidated-artifact',
        artifactKind: 'salvage',
        artifactId: 'combat-match-1',
        branchId: 'cand-use-1',
        revision: 3,
      }),
    ]);
  });
});
