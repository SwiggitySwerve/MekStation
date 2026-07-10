import { EventEmitter } from 'node:events';

import type {
  IClientMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from '../ServerMatchSocketTypes';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import { CampaignHostRegistry } from '../CampaignHostRegistry';

class MockWireSocket extends EventEmitter implements IMatchSocket {
  readonly sent: IServerMessage[] = [];
  readonly closes: Array<{ code?: number; reason?: string }> = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(code?: number, reason?: string): void {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.closes.push({ code, reason });
    this.emit('close');
  }

  inbound(message: IClientMessage | Record<string, unknown> | string): void {
    this.emit(
      'message',
      typeof message === 'string' ? message : JSON.stringify(message),
    );
  }
}

async function makeRegistry(
  arbitrationMode: 'auto-approve' | 'host-review' = 'auto-approve',
): Promise<CampaignHostRegistry> {
  const registry = new CampaignHostRegistry();
  await registry.register('match-campaign', {
    campaignId: 'campaign-sync',
    hostPlayerId: 'pid_host',
    roomCode: 'ABC234',
    arbitrationMode,
    state: {
      ...createEmptyCampaignState('campaign-sync'),
      balance: 1_000_000,
    },
  });
  return registry;
}

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

const quietLogger = {
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

describe('bindCampaignSyncConnection', () => {
  beforeEach(() => {
    quietLogger.error.mockClear();
    quietLogger.log.mockClear();
    quietLogger.warn.mockClear();
  });

  it('closes an unknown campaign match with a typed error', async () => {
    const socket = new MockWireSocket();
    const registry = new CampaignHostRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'missing-match',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });

    expect(socket.sent).toEqual([
      expect.objectContaining({
        kind: 'Error',
        matchId: 'missing-match',
        code: 'UNKNOWN_MATCH',
      }),
      expect.objectContaining({
        kind: 'Close',
        matchId: 'missing-match',
        code: 'UNKNOWN_MATCH',
      }),
    ]);
    expect(socket.closes[0]).toMatchObject({
      code: 1008,
      reason: 'unknown-campaign-match',
    });
  });

  it('streams a campaign snapshot to a joined guest', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignSnapshot',
        matchId: 'match-campaign',
      }),
    );
  });

  it('routes a guest proposal through the server arbiter and broadcasts committed events', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    socket.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-spend',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-spend',
          payload: { amount: 50_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: expect.objectContaining({ status: 'committed' }),
      }),
    );
    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignEvent',
        event: expect.objectContaining({ type: 'FundsChanged' }),
      }),
    );
  });

  it('routes an authenticated host intent through the registered host and pushes the guest event', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guestSocket.sent.length = 0;

    hostSocket.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'host-day-1',
        payload: { days: 1 },
      },
    });
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.host.getState().day).toBe(1);
    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignEvent',
        event: expect.objectContaining({
          type: 'CampaignDayAdvanced',
          payload: { newDay: 1 },
        }),
      }),
    );
  });

  it('rejects a guest attempting to send a host-only campaign intent', async () => {
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });

    guestSocket.inbound({
      kind: 'CampaignHostIntent',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      intent: {
        kind: 'AdvanceDay',
        campaignId: 'campaign-sync',
        intentId: 'guest-day-1',
        payload: { days: 1 },
      },
    });
    await flushAsyncHandlers();

    expect(registry.get('match-campaign')?.host.getState().day).toBe(0);
    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        intentId: 'guest-day-1',
      }),
    );
  });

  it('broadcasts post-battle reconciliation events to joined campaign-sync guests', async () => {
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    guestSocket.sent.length = 0;

    const entry = registry.get('match-campaign');
    expect(entry).not.toBeNull();
    await reconcileCoopBattle(entry!.host, {
      campaignId: 'campaign-sync',
      matchId: 'battle-post-1',
      fundsDelta: -25_000,
      fundsReason: 'Repair costs',
      salvageValue: 75_000,
      rosterChanges: [
        {
          unitId: 'unit-A',
          designation: 'Atlas AS7-D',
          status: 'damaged',
        },
      ],
    });
    await flushAsyncHandlers();

    const eventTypes = guestSocket.sent
      .filter((message) => message.kind === 'CampaignEvent')
      .map((message) => readCampaignEventType(message));
    expect(eventTypes).toEqual([
      'FundsChanged',
      'SalvageAllocated',
      'RosterUnitChanged',
    ]);
  });

  it('round-trips a host-review proposal from guest to host decision', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry('host-review');

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    guestSocket.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      proposal: {
        proposalId: 'proposal-spend',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_guest',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-spend',
          payload: { amount: 50_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: { status: 'pending', proposalId: 'proposal-spend' },
      }),
    );
    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignProposal',
        proposal: expect.objectContaining({
          proposal: expect.objectContaining({ proposalId: 'proposal-spend' }),
          balanceAtSubmit: 1_000_000,
          effectSummary: expect.stringContaining('Spend'),
        }),
      }),
    );

    hostSocket.inbound({
      kind: 'CampaignDecision',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      proposalId: 'proposal-spend',
      decision: 'approve',
    });
    await flushAsyncHandlers();

    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignDecision',
        proposalId: 'proposal-spend',
        result: expect.objectContaining({ status: 'committed' }),
      }),
    );
    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignEvent',
        event: expect.objectContaining({ type: 'FundsChanged' }),
      }),
    );
  });

  it('rejects unknown campaign frame kinds loudly', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    socket.inbound({
      kind: 'CampaignTimeTravel',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'BAD_ENVELOPE',
        reason: expect.stringContaining('Unknown campaign-sync frame kind'),
      }),
    );
  });

  it('broadcasts participation choices and records them in the registry', async () => {
    const hostSocket = new MockWireSocket();
    const guestSocket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
    });
    hostSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    guestSocket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    guestSocket.inbound({
      kind: 'CampaignParticipation',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      participation: {
        matchId: 'match-campaign',
        missionId: 'mission-alpha',
        playerId: 'pid_guest',
        role: 'guest',
        choice: 'deploy',
        force: {
          id: 'force-guest',
          name: 'Guest Force',
          parentForceId: undefined,
          subForceIds: [],
          unitIds: ['unit-guest'],
          forceType: 'standard',
          formationLevel: 'lance',
          createdAt: '2026-06-21T00:00:00.000Z',
          updatedAt: '2026-06-21T00:00:00.000Z',
        },
      },
    });
    await flushAsyncHandlers();

    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignParticipation',
        participation: expect.objectContaining({
          missionId: 'mission-alpha',
          playerId: 'pid_guest',
          choice: 'deploy',
        }),
      }),
    );
    expect(guestSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignParticipation',
        participation: expect.objectContaining({
          missionId: 'mission-alpha',
          playerId: 'pid_guest',
        }),
      }),
    );
    expect(
      registry.get('match-campaign')?.getParticipationRecords('mission-alpha'),
    ).toEqual([
      expect.objectContaining({
        playerId: 'pid_guest',
        choice: 'deploy',
      }),
    ]);
  });
});

function readCampaignEventType(message: IServerMessage): string | null {
  if (message.kind !== 'CampaignEvent') return null;
  if (typeof message.event !== 'object' || message.event === null) return null;
  const event = message.event as { type?: unknown };
  return typeof event.type === 'string' ? event.type : null;
}
