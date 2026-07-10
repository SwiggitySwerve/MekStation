import { EventEmitter } from 'node:events';

import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

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

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 32; i += 1) {
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
    const applyHostIntent = jest.spyOn(host, 'applyHostIntent');
    const creditSalvagePool = jest.spyOn(host, 'creditSalvagePool');
    const applyRosterUnitChange = jest.spyOn(host, 'applyRosterUnitChange');

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'campaign-sync-match-1',
      verifiedPlayerId: 'host-player-1',
      logger: quietLogger,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'campaign-sync-match-1',
      verifiedPlayerId: 'guest-player-1',
      logger: quietLogger,
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
    expect(applyHostIntent).toHaveBeenCalledTimes(1);
    expect(creditSalvagePool).toHaveBeenCalledTimes(1);
    expect(applyRosterUnitChange).toHaveBeenCalledTimes(1);

    hostSocket.inbound(reconcileBattleFrame);
    await flushAsyncHandlers();

    expect(
      guestSocket.sent.filter((message) => message.kind === 'CampaignEvent'),
    ).toHaveLength(3);
    expect(applyHostIntent).toHaveBeenCalledTimes(1);
    expect(creditSalvagePool).toHaveBeenCalledTimes(1);
    expect(applyRosterUnitChange).toHaveBeenCalledTimes(1);
  });
});
