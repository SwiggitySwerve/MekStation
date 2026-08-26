import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';

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
      rosterUnits: {
        'unit-guest': {
          unitId: 'unit-guest',
          designation: 'Guest Mech',
          status: 'operational' as const,
          unitRef: 'guest-mech',
          unitSource: 'canonical' as const,
        },
      },
      forceUnits: { 'force-guest': ['unit-guest'] },
    },
  });
  return registry;
}

async function flushAsyncHandlers(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

function participate(
  socket: MockWireSocket,
  participation: Record<string, unknown>,
): void {
  // Deliberately a loose record: these cases send payloads the schema
  // must REJECT, so the literal must not be checked against the valid
  // CampaignParticipation shape.
  socket.inbound({
    kind: 'CampaignParticipation',
    matchId: 'match-campaign',
    ts: nowIso(),
    playerId: 'pid_guest',
    participation,
  } as Record<string, unknown>);
}

function sawError(
  socket: MockWireSocket,
  code: string,
  reason?: string,
): boolean {
  return socket.sent.some(
    (message) =>
      message.kind === 'Error' &&
      message.code === code &&
      (reason === undefined || message.reason === reason),
  );
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
      replicaStore: null,
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
      replicaStore: null,
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

  /** In-memory membership port: the store's contract without a database. */
  function fakeMembership(
    seed: {
      active?: readonly string[];
      revoked?: readonly string[];
    } = {},
  ) {
    const active = new Set(seed.active ?? []);
    const revoked = new Set(seed.revoked ?? []);
    const bound: { participantId: string; seat: string }[] = [];
    return {
      bound,
      isActive: (_c: string, _s: string, participantId: string) =>
        active.has(participantId),
      isRevoked: (_c: string, _s: string, participantId: string) =>
        revoked.has(participantId),
      bind: (input: { participantId: string; seat: 'gm' | 'player' }) => {
        bound.push({ participantId: input.participantId, seat: input.seat });
        active.add(input.participantId);
      },
    };
  }

  it('refuses a revoked member even when they present a valid room code', async () => {
    // The property that did not exist before durable membership:
    // revocation used to last exactly as long as the member stayed
    // disconnected, because the room code was the whole check.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership({ revoked: ['pid_guest'] });

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
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
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'membership-revoked',
      }),
    );
    expect(socket.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'CampaignSnapshot' }),
    );
  });

  it('admits a returning member whose room code is now wrong', async () => {
    // Durable routing, not invite routing: a rotated or expired code
    // must not lock out someone already admitted.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership({ active: ['pid_guest'] });

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ZZZ999',
    });
    await flushAsyncHandlers();

    expect(socket.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
  });

  it('records a newcomer admitted by room code as a durable member', async () => {
    // The invite worked once; it should not be needed again.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
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

    expect(membership.bound).toContainEqual({
      participantId: 'pid_guest',
      seat: 'player',
    });
  });

  it('records the host as the gm seat', async () => {
    const socket = new MockWireSocket();
    const registry = await makeRegistry();
    const membership = fakeMembership();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();

    expect(membership.bound).toContainEqual({
      participantId: 'pid_host',
      seat: 'gm',
    });
  });

  it('lets a durable member cold-reconnect with no room code at all', async () => {
    // The reconnection a page reload produces. The first join is an
    // invited newcomer; the SECOND presents no code whatsoever, which is
    // the situation after a client loses whatever it had cached. Before
    // durable membership this was simply a rejected join.
    const registry = await makeRegistry();
    const membership = fakeMembership();

    const first = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: first,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    first.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    expect(membership.bound).toContainEqual({
      participantId: 'pid_guest',
      seat: 'player',
    });

    // Cold restart of the client: brand new socket, no room code.
    const reconnected = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: reconnected,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
      membership,
    });
    reconnected.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_guest',
      role: 'guest',
    });
    await flushAsyncHandlers();

    expect(reconnected.sent).not.toContainEqual(
      expect.objectContaining({ kind: 'Error' }),
    );
  });

  it('still refuses a stranger who presents no room code', async () => {
    // The control. Without it, the row above would pass against a server
    // that had simply stopped checking anything at all.
    const socket = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_stranger',
      logger: quietLogger,
      replicaStore: null,
      membership: fakeMembership(),
    });
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_stranger',
      role: 'guest',
    });
    await flushAsyncHandlers();

    expect(socket.sent).toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
  });

  it('does not fan out to a socket whose join was rejected', async () => {
    // `addSocketToMatch` runs as the FIRST statement of the join
    // handler, before the room code is checked. A guest who presents the
    // wrong code is told UNKNOWN_MATCH and the handler returns - but the
    // socket is already in the broadcast set and nothing removes it, so
    // it keeps receiving every campaign event for a campaign it was
    // refused entry to. Umbrella 6.1: authenticated durable membership
    // must precede registration as a fan-out recipient.
    const rejected = new MockWireSocket();
    const host = new MockWireSocket();
    const registry = await makeRegistry();

    await bindCampaignSyncConnection({
      socket: rejected,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_intruder',
      logger: quietLogger,
      replicaStore: null,
    });
    rejected.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_intruder',
      role: 'guest',
      roomCode: 'ZZZ999',
    });
    await flushAsyncHandlers();

    // The refusal itself is correct and stays correct.
    expect(rejected.sent).toContainEqual(
      expect.objectContaining({ kind: 'Error', code: 'UNKNOWN_MATCH' }),
    );
    const afterRefusal = rejected.sent.length;

    // Now drive a real broadcast on that campaign.
    await bindCampaignSyncConnection({
      socket: host,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    host.inbound({
      kind: 'CampaignJoin',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      role: 'host',
      roomCode: 'ABC234',
    });
    await flushAsyncHandlers();
    host.inbound({
      kind: 'CampaignProposal',
      matchId: 'match-campaign',
      ts: nowIso(),
      playerId: 'pid_host',
      proposal: {
        proposalId: 'proposal-leak',
        campaignId: 'campaign-sync',
        proposingPlayerId: 'pid_host',
        ts: nowIso(),
        intent: {
          kind: 'SpendFunds',
          campaignId: 'campaign-sync',
          intentId: 'intent-leak',
          payload: { amount: 1_000, reason: 'Ammo' },
        },
      },
    });
    await flushAsyncHandlers();

    // The refused socket must have received NOTHING further.
    expect(rejected.sent.slice(afterRefusal)).toEqual([]);
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
      replicaStore: null,
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
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
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
      replicaStore: null,
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
      replicaStore: null,
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
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
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
      replicaStore: null,
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
    const choice = {
      missionId: 'mission-alpha',
      forceId: 'force-guest',
      choice: 'deploy',
    };

    await bindCampaignSyncConnection({
      socket: hostSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_host',
      logger: quietLogger,
      replicaStore: null,
    });
    await bindCampaignSyncConnection({
      socket: guestSocket,
      registry,
      matchId: 'match-campaign',
      verifiedPlayerId: 'pid_guest',
      logger: quietLogger,
      replicaStore: null,
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
    const records = () =>
      registry
        .get('match-campaign')
        ?.getParticipationRecords('mission-alpha') ?? [];

    participate(guestSocket, choice);
    await flushAsyncHandlers();
    const accepted = records()[0];
    participate(guestSocket, choice);
    await flushAsyncHandlers();
    expect(records()).toHaveLength(1);

    guestSocket.sent.length = 0;
    participate(guestSocket, {
      missionId: 'mission-alpha',
      playerId: 'pid_host',
      role: 'host',
      choice: 'deploy',
      force: { id: 'force-guest', unitIds: ['unit-forged'] },
    });
    await flushAsyncHandlers();
    const forgedIdentityRejected = sawError(guestSocket, 'BAD_ENVELOPE');
    const fullForceRejected = forgedIdentityRejected && records().length === 1;

    guestSocket.sent.length = 0;
    participate(guestSocket, { ...choice, forceId: 'foreign-force' });
    await flushAsyncHandlers();
    const foreignForceRejected = sawError(
      guestSocket,
      'INVALID_INTENT',
      'foreign-force',
    );

    registry.get('match-campaign')?.advanceRevision(1);
    guestSocket.sent.length = 0;
    participate(guestSocket, choice);
    await flushAsyncHandlers();
    const staleRevisionRejected = sawError(
      guestSocket,
      'INVALID_INTENT',
      'stale-revision',
    );

    expect(hostSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'CampaignParticipation',
        playerId: 'pid_guest',
        role: 'guest',
        participation: expect.objectContaining(choice),
      }),
    );
    expect(records()).toEqual([
      expect.objectContaining({
        playerId: 'pid_guest',
        role: 'guest',
        choice: 'deploy',
      }),
    ]);
    const assertions = {
      'authorizedChoiceAccepted===true':
        accepted?.choice === 'deploy' && accepted.force.id === 'force-guest',
      'foreignForceRejected===true': foreignForceRejected,
      'forgedIdentityRejected===true': forgedIdentityRejected,
      'fullForceRejected===true': fullForceRejected,
      'serverPlayerDerived===true': accepted?.playerId === 'pid_guest',
      'serverRoleDerived===true': accepted?.role === 'guest',
      'staleRevisionRejected===true': staleRevisionRejected,
    };
    if (Object.values(assertions).some((value) => value !== true)) {
      throw new Error(
        `wave assertion checks failed: ${JSON.stringify(assertions)}`,
      );
    }
    const artifactDir = process.env.CAMP01_ARTIFACT_DIR;
    const runId = process.env.CAMP01_RUN_ID;
    const wavePath =
      artifactDir && runId ? path.join(artifactDir, 'wave-result.json') : null;
    if (wavePath && !fs.existsSync(wavePath)) {
      fs.writeFileSync(
        wavePath,
        `${JSON.stringify({ schema: 'camp01-wave-result/v1', wave: 'camp-01c', runId, status: 'passed', assertions })}\n`,
        { flag: 'wx' },
      );
    }
  });
});

function readCampaignEventType(message: IServerMessage): string | null {
  if (message.kind !== 'CampaignEvent') return null;
  if (typeof message.event !== 'object' || message.event === null) return null;
  const event = message.event as { type?: unknown };
  return typeof event.type === 'string' ? event.type : null;
}
